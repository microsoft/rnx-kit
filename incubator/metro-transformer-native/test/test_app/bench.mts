#!/usr/bin/env node
/**
 * test_app benchmark harness.
 *
 * For each permutation in `permutations.mts`, spawns N+1 fresh `runBundle`
 * subprocesses (one warm-up + N measured). Aggregates wall time, heap and
 * bundle size into mean/p50/p95 figures per permutation. Emits:
 *
 *   - A bordered summary table to stdout (safe to redirect).
 *   - A JSON results blob to `test/test_app/results/<ISO-timestamp>.json`.
 *
 * Usage:
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning \
 *     test/test_app/bench.mts \
 *     [--iterations N] [--filter <id>] [--no-evaluate]
 *
 * Flags:
 *   --iterations <n>  measured iterations per permutation (default 3)
 *   --filter <id>     run only the permutation with this id (repeatable)
 *   --no-evaluate     skip the post-bundle vm-evaluation sanity check
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatAsTable, type ColumnOptions } from "@rnx-kit/tools-formatting";
import { evaluateBundle } from "./evaluateBundle.mts";
import { PERMUTATIONS, type Permutation } from "./permutations.mts";
import { runBundle, type RunBundleResult } from "./runBundle.mts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");
const DIST_DIR = path.join(__dirname, "dist");

type Args = {
  iterations: number;
  filters: string[];
  evaluate: boolean;
};

function parseArgs(argv: string[]): Args {
  const out: Args = { iterations: 3, filters: [], evaluate: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--iterations") {
      out.iterations = Number(argv[++i] ?? "3");
    } else if (a === "--filter") {
      out.filters.push(argv[++i] ?? "");
    } else if (a === "--no-evaluate") {
      out.evaluate = false;
    } else if (a === "--help" || a === "-h") {
      process.stdout.write(
        "Usage: bench.mts [--iterations N] [--filter <id>] [--no-evaluate]\n"
      );
      process.exit(0);
    } else {
      process.stderr.write(`Unknown arg: ${a}\n`);
      process.exit(2);
    }
  }
  return out;
}

type IterationSample = {
  wallMs: number;
  bundleMs: number;
  loadMs: number;
  heap: number;
  bytes: number;
};

type PermutationStats = {
  id: string;
  description: string;
  success: boolean;
  iterations: number;
  evaluated: boolean;
  evaluateError?: string;
  bundleError?: string;
  wallMs: Aggregate;
  bundleMs: Aggregate;
  loadMs: Aggregate;
  heap: Aggregate;
  bytes: number;
};

type Aggregate = {
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
};

function aggregate(samples: number[]): Aggregate {
  if (samples.length === 0) {
    return { mean: 0, median: 0, p95: 0, min: 0, max: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / sorted.length;
  const pick = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    mean,
    median: pick(0.5),
    p95: pick(0.95),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

async function runPermutation(
  perm: Permutation,
  args: Args
): Promise<PermutationStats> {
  const bundleOut = `./dist/${perm.id}.bundle.js`;
  const absBundlePath = path.join(DIST_DIR, `${perm.id}.bundle.js`);
  const samples: IterationSample[] = [];
  let lastResult: RunBundleResult | undefined;

  const total = args.iterations + 1; // +1 warm-up
  for (let i = 0; i < total; i++) {
    process.stderr.write(
      `[${perm.id}] iter ${i + 1}/${total}${i === 0 ? " (warm-up)" : ""}\n`
    );
    const r = await runBundle({ ...perm.options, bundleOut });
    lastResult = r;
    if (!r.success) {
      // Permutations that aren't expected to evaluate may still bundle —
      // record the failure and move on.
      return {
        id: perm.id,
        description: perm.description,
        success: false,
        iterations: i,
        evaluated: false,
        bundleError: r.error?.message,
        wallMs: aggregate([]),
        bundleMs: aggregate([]),
        loadMs: aggregate([]),
        heap: aggregate([]),
        bytes: 0,
      };
    }
    if (i === 0) continue;
    samples.push({
      wallMs: r.wallMs,
      bundleMs: r.times.bundle,
      loadMs: r.times.load,
      heap: r.heap,
      bytes: r.bytes ?? 0,
    });
  }

  let evaluated = false;
  let evaluateError: string | undefined;
  if (args.evaluate && perm.evaluate && lastResult?.success) {
    try {
      const ev = await evaluateBundle(absBundlePath);
      if (typeof ev.nodeapp.runApp !== "function" || !ev.smallOutput) {
        throw new Error("evaluation produced unexpected shape");
      }
      evaluated = true;
    } catch (err) {
      evaluateError = (err as Error).message;
    }
  }

  return {
    id: perm.id,
    description: perm.description,
    success: true,
    iterations: samples.length,
    evaluated,
    evaluateError,
    wallMs: aggregate(samples.map((s) => s.wallMs)),
    bundleMs: aggregate(samples.map((s) => s.bundleMs)),
    loadMs: aggregate(samples.map((s) => s.loadMs)),
    heap: aggregate(samples.map((s) => s.heap)),
    bytes: samples.at(-1)?.bytes ?? 0,
  };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const perms = args.filters.length
    ? PERMUTATIONS.filter((p) => args.filters.includes(p.id))
    : PERMUTATIONS;
  if (perms.length === 0) {
    process.stderr.write(`No permutations matched filter ${args.filters}\n`);
    process.exit(2);
  }

  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const allStats: PermutationStats[] = [];
  for (const perm of perms) {
    const stats = await runPermutation(perm, args);
    allStats.push(stats);
    if (stats.bundleError) {
      process.stderr.write(`  [${perm.id}] FAILED: ${stats.bundleError}\n`);
    } else if (stats.evaluateError) {
      process.stderr.write(
        `  [${perm.id}] bundle built but eval failed: ${stats.evaluateError}\n`
      );
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsFile = path.join(RESULTS_DIR, `${timestamp}.json`);
  await fs.writeFile(
    resultsFile,
    JSON.stringify(
      {
        timestamp,
        node: process.version,
        platform: process.platform,
        iterations: args.iterations,
        stats: allStats,
      },
      null,
      2
    )
  );
  process.stderr.write(`Results written to ${resultsFile}\n`);

  const rows = allStats.map((s) => [
    s.id,
    s.success
      ? s.evaluated
        ? "✅ ran"
        : s.evaluateError
          ? "⚠️ eval-fail"
          : "🛠 built"
      : "❌ failed",
    s.bundleMs.mean,
    s.bundleMs.p95,
    s.heap.mean,
    s.bytes,
  ]);
  const columns: (string | ColumnOptions)[] = [
    { label: "Permutation", align: "left" },
    { label: "Status", align: "left" },
    {
      label: "bundleMs mean",
      align: "right",
      format: (v) => `${(v as number).toFixed(0)}ms`,
    },
    {
      label: "bundleMs p95",
      align: "right",
      format: (v) => `${(v as number).toFixed(0)}ms`,
    },
    {
      label: "heap (mean)",
      align: "right",
      format: (v) => formatBytes(v as number),
    },
    { label: "bytes", align: "right", format: (v) => formatBytes(v as number) },
  ];

  process.stdout.write(`# test_app bench results\n\n`);
  process.stdout.write(
    `Node ${process.version} on ${process.platform}, ${args.iterations} iter (+1 warm-up) per row.\n\n`
  );
  process.stdout.write(formatAsTable(rows, { columns }));
  process.stdout.write("\n");
}

await main();
