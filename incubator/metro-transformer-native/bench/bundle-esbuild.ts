#!/usr/bin/env node
/**
 * esbuild-serializer interop smoke test (README goal #7).
 *
 * Runs `Metro.runBuild` against `bench/fixtures/test-app-shim/` using a
 * config that combines `@rnx-kit/metro-transformer-native` with
 * `@rnx-kit/metro-serializer-esbuild`. Asserts that:
 *
 *   1. The bundle is non-empty.
 *   2. The unused `treeShakeMe` export — whose value is the string
 *      "TREE_SHAKE_ME_MARKER" — is eliminated from the bundle.
 *
 * This is the full-bundle proof complementing the in-process check in
 * slice 02. If this passes, the native transformer is correctly
 * producing ESM output that esbuild's tree-shaker can analyze.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHIM_DIR = path.join(__dirname, "fixtures", "test-app-shim");
const CONFIG_PATH = path.join(SHIM_DIR, "metro.config.esbuild.js");
const ENTRY = path.join(SHIM_DIR, "index.js");

const MARKER = "TREE_SHAKE_ME_MARKER";

async function main(): Promise<number> {
  // metro-serializer-esbuild looks up Metro via `findMetroPath(process.cwd())`,
  // which walks `react-native → @react-native-community/cli → metro`. The
  // shim has none of those installed, so we pivot cwd to a directory that
  // does (the metro-serializer-esbuild package itself, which lists those
  // packages as devDeps). This affects ONLY the version probe and the
  // internal source-map require path; the bundle's projectRoot stays SHIM_DIR.
  const esbuildSerializerDir = path.dirname(
    require.resolve("@rnx-kit/metro-serializer-esbuild/package.json")
  );
  process.chdir(esbuildSerializerDir);

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
  console.error(`[bundle-esbuild.ts] loading config: ${CONFIG_PATH}`);
  const config = await MetroConfig.loadConfig({
    config: CONFIG_PATH,
    cwd: SHIM_DIR,
  });

  // oxlint-disable-next-line no-console
  console.error(`[bundle-esbuild.ts] entry: ${ENTRY}`);
  const result = await Metro.runBuild(config, {
    entry: ENTRY,
    dev: false,
    minify: false,
    platform: "ios",
    sourceMap: false,
  });

  const code = result.code ?? "";
  // oxlint-disable-next-line no-console
  console.error(`[bundle-esbuild.ts] bundle size: ${code.length} bytes`);

  if (code.length === 0) {
    // oxlint-disable-next-line no-console
    console.error("[bundle-esbuild.ts] FAIL: bundle is empty");
    return 1;
  }
  if (code.includes(MARKER)) {
    // oxlint-disable-next-line no-console
    console.error(
      `[bundle-esbuild.ts] FAIL: bundle still contains "${MARKER}" — tree-shaking did NOT eliminate the unused export. The native transformer is likely emitting CommonJS rather than ESM, or handleModules:true was set.`
    );
    return 1;
  }

  if (process.env.RNX_BENCH_WRITE_BUNDLE) {
    const outFile = path.join(__dirname, ".cache", "bundle-esbuild.js");
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, code);
    // oxlint-disable-next-line no-console
    console.error(`[bundle-esbuild.ts] wrote ${outFile}`);
  }
  // oxlint-disable-next-line no-console
  console.error("[bundle-esbuild.ts] OK");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // oxlint-disable-next-line no-console
    console.error("[bundle-esbuild.ts] error:", err);
    process.exit(1);
  });
