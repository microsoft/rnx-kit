#!/usr/bin/env node
/**
 * Real-Metro-bundle smoke test for the native transformer.
 *
 * Runs `Metro.runBuild` against `bench/fixtures/test-app-shim/` using a
 * config that wires in `@rnx-kit/metro-transformer-native` and asserts
 * that the resulting bundle is non-empty and contains the Metro runtime
 * markers `__r(` and `__d(`.
 *
 * This is a smoke test, not a benchmark. It validates that the
 * transformer can be loaded and invoked by Metro under realistic
 * configuration — the kind of failure that would not be caught by the
 * in-process e2e tests.
 *
 * Exits 0 on success, non-zero with a diagnostic message on failure.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHIM_DIR = path.join(__dirname, "fixtures", "test-app-shim");
const CONFIG_PATH = path.join(SHIM_DIR, "metro.config.js");
const ENTRY = path.join(SHIM_DIR, "index.js");

async function main(): Promise<number> {
  const Metro = require("metro") as {
    runBuild: (
      config: unknown,
      // oxlint-disable-next-line typescript/no-explicit-any
      options: any
    ) => Promise<{ code: string; map?: string }>;
  };
  const MetroConfig = require("metro-config") as {
    // oxlint-disable-next-line typescript/no-explicit-any
    loadConfig: (argv: any, defaults?: any) => Promise<any>;
  };

  // oxlint-disable-next-line no-console
  console.error(`[bundle.ts] loading config: ${CONFIG_PATH}`);
  const config = await MetroConfig.loadConfig({
    config: CONFIG_PATH,
    cwd: SHIM_DIR,
  });

  // oxlint-disable-next-line no-console
  console.error(`[bundle.ts] entry: ${ENTRY}`);
  const result = await Metro.runBuild(config, {
    entry: ENTRY,
    dev: false,
    minify: false,
    platform: "ios",
    sourceMap: false,
  });

  const code = result.code ?? "";
  // oxlint-disable-next-line no-console
  console.error(`[bundle.ts] bundle size: ${code.length} bytes`);

  if (code.length === 0) {
    // oxlint-disable-next-line no-console
    console.error("[bundle.ts] FAIL: bundle is empty");
    return 1;
  }
  if (!code.includes("__r(") || !code.includes("__d(")) {
    // oxlint-disable-next-line no-console
    console.error(
      "[bundle.ts] FAIL: bundle missing Metro runtime markers (__r(, __d()"
    );
    return 1;
  }

  // Optional: when RNX_BENCH_WRITE_BUNDLE is set, write the bundle to a
  // location oxlint deliberately excludes (`bench/.cache/`). The default
  // mode is in-memory only — that keeps the linter happy and avoids
  // committing generated artifacts. The dot-prefix ensures it falls under
  // the workspace's standard "ignore dotted dirs" pattern.
  if (process.env.RNX_BENCH_WRITE_BUNDLE) {
    const outFile = path.join(__dirname, ".cache", "bundle-native.js");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, code);
    // oxlint-disable-next-line no-console
    console.error(`[bundle.ts] wrote ${outFile}`);
  }
  // oxlint-disable-next-line no-console
  console.error("[bundle.ts] OK");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // oxlint-disable-next-line no-console
    console.error("[bundle.ts] error:", err);
    process.exit(1);
  });
