import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BundleOptions, BundleResult } from "./options.mts";
import { getEnvSettings } from "./options.mts";

export type RunBundleResult = BundleResult & {
  heap: number;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bundleCliPath = path.join(__dirname, "bundle.mjs");

/**
 * Run the bundle script in a sub-process
 * - pass the options provided via environment variables
 * - capture the structured JSON output from the script
 * - also capturing the heap usage in the returned result
 * @param options options to configure the bundle process
 */
export function runBundle(options?: BundleOptions): RunBundleResult {
  const envOptions = getEnvSettings(options);
}
