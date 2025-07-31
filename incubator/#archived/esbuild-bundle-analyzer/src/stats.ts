import type { Metafile } from "./metafile";
import type { Stats } from "./types";

/**
 * Returns a summary statistics of the given metafile.
 *
 * @param metafile The metafile to analyze.
 * @returns Summary statistics object.
 */
export function stats(metafile: Metafile): Stats {
  const { inputs, outputs } = metafile;
  let totalBytes = 0;
  let esmBytes = 0;
  let cjsBytes = 0;
  let otherBytes = 0;
  let nodeModules = 0;
  let nodeModulesBytes = 0;
  let countOut = 0;
  let bytesOut = 0;
  const keys = Object.keys(inputs);

  for (const input of keys) {
    const file = inputs[input];

    switch (file.format) {
      case "esm":
        esmBytes += file.bytes;
        break;
      case "cjs":
        cjsBytes += file.bytes;
        break;
      default:
        otherBytes += file.bytes;
        break;
    }

    if (input.includes("node_modules")) {
      nodeModules++;
      nodeModulesBytes += file.bytes;
    }

    totalBytes += file.bytes;
  }

  for (const output in outputs) {
    // Don't count sourcemaps
    if (!output.includes(".map")) {
      countOut++;
      bytesOut += outputs[output].bytes;
    }
  }

  return {
    files: keys.length,
    totalBytes,
    esmBytes,
    cjsBytes,
    otherBytes,
    nodeModules,
    nodeModulesBytes,
    countOut,
    bytesOut,
  };
}
