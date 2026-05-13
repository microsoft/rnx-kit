#!/usr/bin/env node
/**
 * Compatibility regression bundle diff (Task 5.4).
 *
 * Builds the test-app-shim twice — once with the native transformer, once
 * with `@react-native/metro-babel-transformer` — and computes a normalized
 * diff. Documented expected differences (JSX runtime call form, type-erased
 * lines, etc.) are allowlisted via `bench/diff-allowlist.json` and counted
 * separately from "regression" lines.
 *
 * Output:
 *   - A JSON report at `bench/results/bundle-diff-<ISO>.json`.
 *   - A pass/fail summary on stdout. Pass when regression-line ratio < 5%.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHIM_DIR = path.join(__dirname, "fixtures", "test-app-shim");
const ENTRY = path.join(SHIM_DIR, "index.js");
const NATIVE_CONFIG = path.join(SHIM_DIR, "metro.config.js");
const BASELINE_CONFIG = path.join(SHIM_DIR, "metro.config.baseline.js");
const ALLOWLIST_PATH = path.join(__dirname, "diff-allowlist.json");
const REGRESSION_THRESHOLD = 0.05; // 5% of total lines

type Allowlist = {
  expectedSubstrings: string[];
  expectedRegexes: string[];
};

async function buildOnce(configPath: string): Promise<string> {
  const Metro = require("metro") as {
    runBuild: (
      config: unknown,
      // oxlint-disable-next-line typescript/no-explicit-any
      options: any
    ) => Promise<{ code: string }>;
  };
  const MetroConfig = require("metro-config") as {
    // oxlint-disable-next-line typescript/no-explicit-any
    loadConfig: (argv: any) => Promise<any>;
  };
  const config = await MetroConfig.loadConfig({ config: configPath, cwd: SHIM_DIR });
  const result = await Metro.runBuild(config, {
    entry: ENTRY,
    dev: false,
    minify: false,
    platform: "ios",
    sourceMap: false,
  });
  return result.code ?? "";
}

/**
 * Normalize bundle code so that diffs reflect *meaningful* differences and
 * not surface incidentals. We:
 *   - Strip blank lines.
 *   - Replace numeric module IDs (`__d(...,N,[...])`) with a placeholder.
 *   - Trim trailing whitespace.
 *   - Collapse runs of whitespace inside lines.
 */
function normalize(code: string): string[] {
  return code
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .map((l) =>
      l
        // Numeric module IDs vary by graph order — replace with N.
        .replace(/__d\(([^,]+),\s*\d+,/g, "__d($1,N,")
        // Source map URL is always different.
        .replace(/\/\/# sourceMappingURL=.*$/, "//# sourceMappingURL=…")
    )
    .filter((l) => l.length > 0);
}

function makeAllowlistMatcher(allowlist: Allowlist): (line: string) => boolean {
  const regexes = allowlist.expectedRegexes.map((r) => new RegExp(r));
  return (line: string): boolean => {
    for (const s of allowlist.expectedSubstrings) {
      if (line.includes(s)) return true;
    }
    for (const r of regexes) {
      if (r.test(line)) return true;
    }
    return false;
  };
}

/**
 * Symmetric line-set diff. Each line that appears in one bundle but not
 * the other counts as a difference. We do NOT use Myers diff here — the
 * normalized output is line-order-insensitive after our module-ID
 * normalization, and a set diff is the right measure of "what content
 * differs".
 */
function diffLines(a: string[], b: string[]): { onlyA: string[]; onlyB: string[] } {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA: string[] = [];
  const onlyB: string[] = [];
  for (const line of setA) if (!setB.has(line)) onlyA.push(line);
  for (const line of setB) if (!setA.has(line)) onlyB.push(line);
  return { onlyA, onlyB };
}

async function main(): Promise<number> {
  // oxlint-disable-next-line no-console
  console.error("[bundle-compare.ts] building native...");
  const nativeCode = await buildOnce(NATIVE_CONFIG);
  // oxlint-disable-next-line no-console
  console.error("[bundle-compare.ts] building baseline...");
  const baselineCode = await buildOnce(BASELINE_CONFIG);

  const native = normalize(nativeCode);
  const baseline = normalize(baselineCode);
  const total = Math.max(native.length, baseline.length);

  const allowlist = JSON.parse(
    fs.readFileSync(ALLOWLIST_PATH, "utf8")
  ) as Allowlist;
  const isAllowed = makeAllowlistMatcher(allowlist);

  const { onlyA: onlyNative, onlyB: onlyBaseline } = diffLines(native, baseline);

  const allowedNative = onlyNative.filter(isAllowed);
  const allowedBaseline = onlyBaseline.filter(isAllowed);
  const regressionNative = onlyNative.filter((l) => !isAllowed(l));
  const regressionBaseline = onlyBaseline.filter((l) => !isAllowed(l));

  const regressionCount = regressionNative.length + regressionBaseline.length;
  const regressionRatio = total > 0 ? regressionCount / total : 0;

  const report = {
    timestamp: new Date().toISOString(),
    totalNormalizedLines: total,
    nativeLineCount: native.length,
    baselineLineCount: baseline.length,
    onlyNative: onlyNative.length,
    onlyBaseline: onlyBaseline.length,
    allowedNative: allowedNative.length,
    allowedBaseline: allowedBaseline.length,
    regressionNative: regressionNative.length,
    regressionBaseline: regressionBaseline.length,
    regressionRatio,
    threshold: REGRESSION_THRESHOLD,
    samples: {
      regressionNative: regressionNative.slice(0, 20),
      regressionBaseline: regressionBaseline.slice(0, 20),
    },
  };

  // Diff reports go under bench/.cache/ (oxlint-ignored, gitignored).
  // JSON-only — never .js — so linting is irrelevant either way, but we
  // keep the convention to be consistent with bundle.ts / bundle-esbuild.ts.
  const outFile = path.join(
    __dirname,
    ".cache",
    `bundle-diff-${report.timestamp.replaceAll(":", "-")}.json`
  );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  // oxlint-disable-next-line no-console
  console.log(
    [
      `# Bundle compatibility diff — ${report.timestamp}`,
      "",
      `Total normalized lines:    ${total}`,
      `Native-only lines:         ${onlyNative.length} (${allowedNative.length} allowlisted)`,
      `Baseline-only lines:       ${onlyBaseline.length} (${allowedBaseline.length} allowlisted)`,
      `Regression count:          ${regressionCount}`,
      `Regression ratio:          ${(regressionRatio * 100).toFixed(2)}% (threshold ${REGRESSION_THRESHOLD * 100}%)`,
      "",
      `Report written to: ${outFile}`,
    ].join("\n")
  );

  if (regressionRatio >= REGRESSION_THRESHOLD) {
    // oxlint-disable-next-line no-console
    console.error(
      `[bundle-compare.ts] FAIL: regression ratio ${(regressionRatio * 100).toFixed(2)}% exceeds threshold ${REGRESSION_THRESHOLD * 100}%`
    );
    return 1;
  }

  // oxlint-disable-next-line no-console
  console.error("[bundle-compare.ts] OK");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // oxlint-disable-next-line no-console
    console.error("[bundle-compare.ts] error:", err);
    process.exit(1);
  });
