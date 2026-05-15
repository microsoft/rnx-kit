// Bundle worker. Invoked as a subprocess by runBundle.mts. Reads options from
// the env (see options.mts), runs Metro, writes the bundle to disk, and prints
// a structured JSON result to stdout describing timing, heap and bundle size.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { getEnvOptions, initResult } from "./options.mts";

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ENTRY = fileURLToPath(new URL("./entry.js", import.meta.url));
const CONFIG_PATH = fileURLToPath(
  new URL("./metro.config.cjs", import.meta.url)
);

// metro-serializer-esbuild looks up Metro via `findMetroPath(process.cwd())`,
// which walks `react-native → @react-native-community/cli → metro`. The
// test_app harness directory has none of those, so we pivot cwd to a directory
// that does (the metro-serializer-esbuild package itself, which lists those
// packages as devDeps). This affects ONLY the version probe and the internal
// source-map require path; the bundle's projectRoot is set explicitly.
const esbuildSerializerDir = path.dirname(
  require.resolve("@rnx-kit/metro-serializer-esbuild/package.json")
);

async function main() {
  const options = getEnvOptions();
  const { dev, minify, bundleOut, esbuild } = options;
  const result = initResult();
  result.options = options;

  const heapStart = process.memoryUsage().heapUsed;

  try {
    // Only pivot cwd when actually using the esbuild serializer to keep
    // the baseline path as untouched as possible.
    if (esbuild) {
      process.chdir(esbuildSerializerDir);
    }

    const Metro = require("metro");
    const MetroConfig = require("metro-config");

    const startConfig = performance.now();
    const config = await MetroConfig.loadConfig({
      config: CONFIG_PATH,
      cwd: __dirname,
    });
    const endConfig = performance.now();
    result.times.load = endConfig - startConfig;

    const buildResult = await Metro.runBuild(config, {
      entry: ENTRY,
      dev,
      minify,
      platform: "ios",
      sourceMap: false,
    });
    const endBundle = performance.now();
    result.times.bundle = endBundle - endConfig;
    result.times.total = endBundle - startConfig;

    const code = buildResult.code ?? "";
    result.bytes = code.length;

    const outAbs = path.isAbsolute(bundleOut)
      ? bundleOut
      : path.resolve(__dirname, bundleOut);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    await fs.writeFile(outAbs, code, "utf8");
    result.bundlePath = outAbs;
    result.success = true;
  } catch (error) {
    result.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  result.heap = Math.max(0, process.memoryUsage().heapUsed - heapStart);
  process.stdout.write(JSON.stringify(result) + "\n");
}

await main();
