import { runBuild } from "metro";
import { loadConfig } from "metro-config";
import { fileURLToPath } from "node:url";
import { getEnvOptions, initResult } from "./options.mts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ENTRY = fileURLToPath(new URL("./index.js", import.meta.url));
const CONFIG_PATH = fileURLToPath(
  new URL("./metro.config.cjs", import.meta.url)
);

/**
 * Invoke the metro bundler, configuring the the bundle based on environment options.
 * Then returning structured JSON content describing the results, including timing and any errors.
 */
async function main() {
  const options = getEnvOptions();
  const { dev, minify, bundleOut } = options;
  const result = initResult();

  try {
    const startConfig = performance.now();

    const config = await loadConfig({
      config: CONFIG_PATH,
      cwd: __dirname,
    });
    const endConfig = performance.now();
    result.times.load = endConfig - startConfig;

    // oxlint-disable-next-line no-console
    await runBuild(config, {
      entry: ENTRY,
      bundleOut,
      dev,
      minify,
      maxWorkers: 1,
      platform: "ios",
      sourceMap: false,
    });
    const endBundle = performance.now();
    result.times.bundle = endBundle - endConfig;
    result.times.total = endBundle - startConfig;
    result.success = true;
  } catch (error) {
    result.error = error;
  }
  console.log(JSON.stringify(result));
}

await main();
