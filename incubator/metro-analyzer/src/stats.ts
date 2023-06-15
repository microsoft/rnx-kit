import type { Metafile } from "./metafile.js";
import type { Stats } from "./types.js";

function getSummaryStats(metafile: Metafile): Stats {
  const { inputs, outputs } = metafile;
  let files = 0;
  let totalBytes = 0;
  let esmBytes = 0;
  let cjsBytes = 0;
  let otherBytes = 0;
  let nodeModules = 0;
  let nodeModulesBytes = 0;
  let countOut = 0;
  let bytesOut = 0;

  for (const input in inputs) {
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

    files++;
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
    files,
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

/**
 * Returns a summary statistics of the given metafile.
 *
 * @param metafile The metafile to analyze.
 * @returns Summary statistics object.
 */
export function stats(metafile: Metafile): Stats {
  return getSummaryStats(metafile);
}
