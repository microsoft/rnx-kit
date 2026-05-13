#!/usr/bin/env node
/**
 * Benchmark harness entry point.
 *
 * Usage:
 *   node --experimental-strip-types bench/run.ts [--scenario warm|cold|all|bundle]
 *                                                [--corpus <path>]
 *                                                [--iterations <n>]
 *                                                [--check]
 *
 * Output:
 *   - A markdown summary to stdout.
 *   - A JSON results blob at `bench/results/<ISO-timestamp>.json`.
 *
 * The `--check` flag gates on `bench/thresholds.json`; non-zero exit on
 * breach. See `bench/README.md` for the threshold rationale.
 */

import { fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { loadBaselineTransformer, type Transformer } from "./baseline.ts";
import { loadNativeTransformer } from "./native.ts";
import {
  DEFAULT_CORPUS_REPLICATION,
  DEFAULT_WARM_ITERATIONS,
  resolveScenarios,
  type ScenarioName,
} from "./scenarios.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, "..");

// ── Types ────────────────────────────────────────────────────────────

type CorpusFile = {
  filename: string;
  src: string;
  category: "ts" | "tsx" | "js" | "jsx";
};

type CallSample = {
  filename: string;
  category: CorpusFile["category"];
  wallMs: number;
};

type Aggregate = {
  count: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
};

type PerCategoryAgg = Record<CorpusFile["category"], Aggregate | null>;

type WarmResult = {
  scenario: "warm";
  transformer: string;
  iterations: number;
  reportedIterations: number;
  perCategory: PerCategoryAgg;
  overall: Aggregate;
  heapBytes: number;
};

type ColdResult = {
  scenario: "cold-start";
  transformer: string;
  wallMs: number;
  heapBytes: number;
};

type ResultBlob = {
  timestamp: string;
  node: string;
  platform: string;
  corpus: { source: string; fileCount: number; replication: number };
  results: (WarmResult | ColdResult)[];
};

// ── CLI parsing ──────────────────────────────────────────────────────

type Args = {
  scenario: ScenarioName;
  corpus?: string;
  iterations: number;
  check: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    scenario: "warm",
    iterations: DEFAULT_WARM_ITERATIONS,
    check: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--scenario") {
      const v = argv[++i] as ScenarioName | undefined;
      if (v && ["warm", "cold", "cold-start", "all", "bundle"].includes(v)) {
        args.scenario = v;
      } else {
        throw new Error(`--scenario expects warm|cold|all|bundle, got: ${v}`);
      }
    } else if (a === "--corpus") {
      args.corpus = argv[++i];
    } else if (a === "--iterations") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v < 2) {
        throw new Error("--iterations must be an integer >= 2");
      }
      args.iterations = v;
    } else if (a === "--check") {
      args.check = true;
    } else if (a === "--help" || a === "-h") {
      printHelpAndExit();
    }
  }
  return args;
}

function printHelpAndExit(): never {
  // oxlint-disable-next-line no-console
  console.log(
    [
      "Usage: node --experimental-strip-types bench/run.ts [options]",
      "",
      "Options:",
      "  --scenario warm|cold|all|bundle   Scenario to run (default: warm)",
      "  --corpus <path>                   Directory to scan recursively",
      "  --iterations <n>                  Warm iterations including warm-up (default: 5)",
      "  --check                           Exit non-zero if any threshold is breached",
      "",
      "Environment:",
      "  RNX_BENCH_PROJECT_ROOT  When set, the corpus is ${root}/src/**/*.{ts,tsx,js,jsx}",
    ].join("\n")
  );
  process.exit(0);
}

// ── Corpus loading ───────────────────────────────────────────────────

/**
 * Fixtures that are deliberately malformed or test special paths we don't
 * want polluting the warm-loop numbers. The corpus is meant to be a
 * representative sample of real RN source — not edge cases the test
 * suite uses to exercise error paths.
 */
const CORPUS_SKIP = new Set([
  "syntax-error.ts",
  "flow-typed.js",
  "empty.ts",
  "empty.js",
  "codegen-native.ts",
  "codegen-false-positive.ts",
]);

function categorize(filename: string): CorpusFile["category"] | null {
  const base = path.basename(filename);
  if (CORPUS_SKIP.has(base)) return null;
  if (filename.endsWith(".tsx")) return "tsx";
  if (filename.endsWith(".ts") && !filename.endsWith(".d.ts")) return "ts";
  if (filename.endsWith(".jsx")) return "jsx";
  if (filename.endsWith(".js") && !filename.endsWith(".test.js")) return "js";
  return null;
}

function walkFixtures(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // Skip node_modules and dotted dirs to avoid blowing up on large project roots.
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      out.push(...walkFixtures(full));
    } else if (ent.isFile() && categorize(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function loadCorpus(args: Args): {
  files: CorpusFile[];
  source: string;
  replication: number;
} {
  const envRoot = process.env.RNX_BENCH_PROJECT_ROOT;
  let dir: string;
  let replication = 1;
  let source: string;
  if (args.corpus) {
    dir = path.resolve(args.corpus);
    source = `--corpus ${dir}`;
  } else if (envRoot) {
    dir = path.resolve(envRoot, "src");
    source = `RNX_BENCH_PROJECT_ROOT=${envRoot}`;
  } else {
    dir = path.join(PACKAGE_ROOT, "test", "__fixtures__");
    replication = DEFAULT_CORPUS_REPLICATION;
    source = "test/__fixtures__ (default)";
  }
  if (!fs.existsSync(dir)) {
    throw new Error(`Corpus directory does not exist: ${dir}`);
  }
  const paths = walkFixtures(dir);
  const base: CorpusFile[] = [];
  for (const p of paths) {
    const cat = categorize(path.basename(p));
    if (!cat) continue;
    base.push({ filename: p, src: fs.readFileSync(p, "utf8"), category: cat });
  }
  const files: CorpusFile[] = [];
  for (let i = 0; i < replication; i++) files.push(...base);
  return { files, source, replication };
}

// ── Statistics ───────────────────────────────────────────────────────

function aggregate(samples: number[]): Aggregate {
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const pick = (q: number) => sorted[Math.min(n - 1, Math.floor(q * n))];
  return {
    count: n,
    mean: n > 0 ? sum / n : 0,
    median: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
  };
}

function aggregateByCategory(samples: CallSample[]): PerCategoryAgg {
  const groups: Record<CorpusFile["category"], number[]> = {
    ts: [],
    tsx: [],
    js: [],
    jsx: [],
  };
  for (const s of samples) groups[s.category].push(s.wallMs);
  return {
    ts: groups.ts.length ? aggregate(groups.ts) : null,
    tsx: groups.tsx.length ? aggregate(groups.tsx) : null,
    js: groups.js.length ? aggregate(groups.js) : null,
    jsx: groups.jsx.length ? aggregate(groups.jsx) : null,
  };
}

// ── Warm scenario ────────────────────────────────────────────────────

function makeArgs(file: CorpusFile) {
  return {
    src: file.src,
    filename: file.filename,
    plugins: [],
    options: {
      dev: true,
      hot: false,
      minify: false,
      platform: "ios",
      projectRoot: PACKAGE_ROOT,
      enableBabelRCLookup: true,
      enableBabelRuntime: false,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
    },
  };
}

async function runWarm(
  transformer: Transformer,
  files: CorpusFile[],
  iterations: number
): Promise<WarmResult> {
  const heapBefore = process.memoryUsage().heapUsed;
  const collected: CallSample[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    for (const file of files) {
      const args = makeArgs(file);
      const start = performance.now();
      // Awaiting handles the rare async-transform path. Most calls are sync.
      // oxlint-disable-next-line typescript/no-explicit-any
      const r = transformer.transform(args as any);
      // oxlint-disable-next-line typescript/no-explicit-any
      if (r && typeof (r as any).then === "function") await r;
      const elapsed = performance.now() - start;
      if (iter > 0) {
        // Iteration 0 is warm-up; discard.
        collected.push({
          filename: file.filename,
          category: file.category,
          wallMs: elapsed,
        });
      }
    }
  }

  const heapAfter = process.memoryUsage().heapUsed;
  return {
    scenario: "warm",
    transformer: transformer.name,
    iterations,
    reportedIterations: iterations - 1,
    perCategory: aggregateByCategory(collected),
    overall: aggregate(collected.map((s) => s.wallMs)),
    heapBytes: Math.max(0, heapAfter - heapBefore),
  };
}

// ── Cold-start scenario ──────────────────────────────────────────────

async function runCold(
  transformerKey: "native" | "baseline"
): Promise<ColdResult> {
  // Pick a small TS fixture for the cold-start probe.
  const fixture = path.join(PACKAGE_ROOT, "test", "__fixtures__", "simple.ts");
  const src = fs.readFileSync(fixture, "utf8");
  const worker = path.join(__dirname, "coldWorker.ts");

  return new Promise((resolve, reject) => {
    const child = fork(worker, [transformerKey], {
      execArgv: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
      ],
      stdio: ["ignore", "inherit", "inherit", "ipc"],
    });

    let result: { wallMs: number; heapBytes: number } | null = null;
    child.on("message", (msg) => {
      result = msg as { wallMs: number; heapBytes: number };
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0 || !result) {
        reject(new Error(`cold worker exited with code ${code}`));
        return;
      }
      resolve({
        scenario: "cold-start",
        transformer: transformerKey === "native" ? "native-swc" : "baseline-rn",
        wallMs: result.wallMs,
        heapBytes: result.heapBytes,
      });
    });

    child.send({ filename: fixture, src });
  });
}

// ── Reporting ────────────────────────────────────────────────────────

function formatMs(n: number): string {
  return n.toFixed(2);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

function reportWarm(results: WarmResult[]): string {
  const lines: string[] = [];
  lines.push("## Warm scenario");
  lines.push("");
  lines.push(
    "| Transformer | Cat | n | mean (ms) | p50 | p95 | p99 | max | heap |"
  );
  lines.push("|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    for (const cat of ["ts", "tsx", "js", "jsx"] as const) {
      const a = r.perCategory[cat];
      if (!a) continue;
      lines.push(
        `| ${r.transformer} | ${cat} | ${a.count} | ${formatMs(a.mean)} | ${formatMs(a.median)} | ${formatMs(a.p95)} | ${formatMs(a.p99)} | ${formatMs(a.max)} | ${formatBytes(r.heapBytes)} |`
      );
    }
  }
  // Per-category ratio table (native / baseline).
  const native = results.find((r) => r.transformer === "native-swc");
  const baseline = results.find((r) => r.transformer === "baseline-rn");
  if (native && baseline) {
    lines.push("");
    lines.push("### Ratio native-swc / baseline-rn");
    lines.push("");
    lines.push("| Cat | mean | p95 |");
    lines.push("|---|---|---|");
    for (const cat of ["ts", "tsx", "js", "jsx"] as const) {
      const n = native.perCategory[cat];
      const b = baseline.perCategory[cat];
      if (!n || !b || b.mean === 0) continue;
      lines.push(
        `| ${cat} | ${(n.mean / b.mean).toFixed(2)} | ${(n.p95 / b.p95).toFixed(2)} |`
      );
    }
  }
  return lines.join("\n");
}

function reportCold(results: ColdResult[]): string {
  const lines: string[] = [];
  lines.push("## Cold-start scenario");
  lines.push("");
  lines.push("| Transformer | wall (ms) | heap |");
  lines.push("|---|---|---|");
  for (const r of results) {
    lines.push(
      `| ${r.transformer} | ${formatMs(r.wallMs)} | ${formatBytes(r.heapBytes)} |`
    );
  }
  const native = results.find((r) => r.transformer === "native-swc");
  const baseline = results.find((r) => r.transformer === "baseline-rn");
  if (native && baseline && baseline.wallMs > 0) {
    lines.push("");
    lines.push(
      `Ratio native/baseline: ${(native.wallMs / baseline.wallMs).toFixed(2)}`
    );
  }
  return lines.join("\n");
}

// ── Threshold check ──────────────────────────────────────────────────

type Thresholds = {
  warm: {
    tsMeanRatio: number;
    tsxMeanRatio: number;
    jsMeanRatio: number;
    jsxMeanRatio: number;
  };
  coldStart: { ratio: number };
  heap: { ratio: number };
};

function loadThresholds(): Thresholds | null {
  const p = path.join(__dirname, "thresholds.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Thresholds;
}

function checkThresholds(
  warm: WarmResult[],
  cold: ColdResult[],
  thresholds: Thresholds
): { ok: boolean; messages: string[] } {
  const messages: string[] = [];
  const native = warm.find((r) => r.transformer === "native-swc");
  const baseline = warm.find((r) => r.transformer === "baseline-rn");
  if (native && baseline) {
    const checks: [keyof Thresholds["warm"], CorpusFile["category"]][] = [
      ["tsMeanRatio", "ts"],
      ["tsxMeanRatio", "tsx"],
      ["jsMeanRatio", "js"],
      ["jsxMeanRatio", "jsx"],
    ];
    for (const [tkey, cat] of checks) {
      const n = native.perCategory[cat];
      const b = baseline.perCategory[cat];
      if (!n || !b || b.mean === 0) continue;
      const ratio = n.mean / b.mean;
      const limit = thresholds.warm[tkey];
      if (ratio > limit) {
        messages.push(
          `warm/${cat}: mean ratio ${ratio.toFixed(2)} exceeds threshold ${limit}`
        );
      }
    }
    const heapRatio =
      baseline.heapBytes > 0 ? native.heapBytes / baseline.heapBytes : 0;
    if (heapRatio > thresholds.heap.ratio) {
      messages.push(
        `warm/heap: ratio ${heapRatio.toFixed(2)} exceeds threshold ${thresholds.heap.ratio}`
      );
    }
  }
  const nativeCold = cold.find((r) => r.transformer === "native-swc");
  const baselineCold = cold.find((r) => r.transformer === "baseline-rn");
  if (nativeCold && baselineCold && baselineCold.wallMs > 0) {
    const ratio = nativeCold.wallMs / baselineCold.wallMs;
    if (ratio > thresholds.coldStart.ratio) {
      messages.push(
        `cold-start: ratio ${ratio.toFixed(2)} exceeds threshold ${thresholds.coldStart.ratio}`
      );
    }
  }
  return { ok: messages.length === 0, messages };
}

// ── Bundle scenario delegation ───────────────────────────────────────

async function runBundleScenario(): Promise<number> {
  // The bundle scenario is implemented in sibling scripts; fork them.
  const scripts = ["bundle.ts", "bundle-esbuild.ts"];
  for (const s of scripts) {
    const script = path.join(__dirname, s);
    if (!fs.existsSync(script)) {
      // oxlint-disable-next-line no-console
      console.warn(`bench/${s} not found, skipping`);
      continue;
    }
    const code = await runChildScript(script);
    if (code !== 0) return code;
  }
  return 0;
}

function runChildScript(script: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = fork(script, [], {
      execArgv: [
        "--experimental-strip-types",
        "--disable-warning=ExperimentalWarning",
      ],
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.scenario === "bundle") {
    const code = await runBundleScenario();
    process.exit(code);
  }

  const scenarios = resolveScenarios(args.scenario);
  const corpus = loadCorpus(args);

  // oxlint-disable-next-line no-console
  console.error(
    `Corpus: ${corpus.source} → ${corpus.files.length} file(s) (replication ${corpus.replication})`
  );

  const warmResults: WarmResult[] = [];
  const coldResults: ColdResult[] = [];

  for (const scenario of scenarios) {
    if (scenario === "warm") {
      // Order matters: baseline first so any native lazy-init cost shows
      // up in the FIRST native iteration (which we discard anyway).
      const baseline = loadBaselineTransformer();
      warmResults.push(await runWarm(baseline, corpus.files, args.iterations));
      const native = loadNativeTransformer({});
      warmResults.push(await runWarm(native, corpus.files, args.iterations));
    } else if (scenario === "cold-start") {
      coldResults.push(await runCold("baseline"));
      coldResults.push(await runCold("native"));
    }
  }

  // Markdown summary
  const out: string[] = [];
  out.push(`# Bench results — ${new Date().toISOString()}`);
  out.push("");
  out.push(`Node: ${process.version}  Platform: ${process.platform}`);
  out.push(
    `Corpus: ${corpus.source}, files=${corpus.files.length}, replication=${corpus.replication}`
  );
  out.push("");
  if (warmResults.length) out.push(reportWarm(warmResults));
  if (coldResults.length) {
    if (warmResults.length) out.push("");
    out.push(reportCold(coldResults));
  }
  // oxlint-disable-next-line no-console
  console.log(out.join("\n"));

  // JSON blob
  const blob: ResultBlob = {
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    corpus: {
      source: corpus.source,
      fileCount: corpus.files.length,
      replication: corpus.replication,
    },
    results: [...warmResults, ...coldResults],
  };
  const outFile = path.join(
    __dirname,
    "results",
    `${blob.timestamp.replaceAll(":", "-")}.json`
  );
  fs.writeFileSync(outFile, JSON.stringify(blob, null, 2));
  // oxlint-disable-next-line no-console
  console.error(`Wrote ${outFile}`);

  if (args.check) {
    const thresholds = loadThresholds();
    if (!thresholds) {
      // oxlint-disable-next-line no-console
      console.error("--check requested but bench/thresholds.json not found");
      process.exit(2);
    }
    const { ok, messages } = checkThresholds(
      warmResults,
      coldResults,
      thresholds
    );
    if (!ok) {
      // oxlint-disable-next-line no-console
      console.error("Threshold check FAILED:");
      for (const m of messages) {
        // oxlint-disable-next-line no-console
        console.error(`  - ${m}`);
      }
      process.exit(1);
    }
    // oxlint-disable-next-line no-console
    console.error("Threshold check passed.");
  }
}

main().catch((err) => {
  // oxlint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
