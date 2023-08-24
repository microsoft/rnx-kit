import { info } from "@rnx-kit/console";
import { packageRelativePath } from "@rnx-kit/metro-plugin-cyclic-dependencies-detector";
import chalk from "chalk";
import fs from "fs";
import type { Path, Result, Stats } from "./types";

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 bytes";
  const sizes = ["bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(decimals)} ${sizes[i]}`;
}

function formatText(
  baseline: number,
  candidate: number,
  shouldFormatBytes = true,
  decimals = 1
): string {
  const diff = baseline - candidate;
  const emoji =
    diff === 0 ? "" : diff > 0 ? chalk.green("↓ ") : chalk.red("↑ ");
  return shouldFormatBytes
    ? `${formatBytes(baseline, decimals)} -> ${formatBytes(
        candidate,
        decimals
      )} (${emoji}${formatBytes(Math.abs(baseline - candidate), decimals)})`
    : `${baseline} -> ${candidate} (${emoji}${Math.abs(baseline - candidate)})`;
}

function formatTime(time: number) {
  const microSeconds = 1000000;
  const milliSeconds = 1000;
  let unit, size;

  if (time < 0.0005) {
    unit = "μs";
    size = Math.round(time * microSeconds);
  } else if (time < 0.5) {
    unit = "ms";
    size = Math.round(time * milliSeconds);
  } else {
    unit = "s";
    size = time;
  }

  return `${size} ${unit}`;
}

/**
 * Outputs the difference between the baseline and candidate statistics to the console.
 *
 * @param baseline The baseline statistics
 * @param candidate The candidate statistics
 */
export function outputDiffToConsole(baseline: Stats, candidate: Stats): void {
  info(
    "Comparing baseline and candidate statistics:\n" +
      `  Num. Files: ${formatText(baseline.files, candidate.files, false)}\n` +
      `  Total size: ${formatText(
        baseline.totalBytes,
        candidate.totalBytes
      )}\n` +
      `  ESM: ${formatText(baseline.esmBytes, candidate.esmBytes)}\n` +
      `  CJS: ${formatText(baseline.cjsBytes, candidate.cjsBytes)}\n` +
      `  Other: ${formatText(baseline.otherBytes, candidate.otherBytes)}\n` +
      `  Num. Node modules: ${formatText(
        baseline.nodeModules,
        candidate.nodeModules,
        false
      )}\n` +
      `  Node modules size: ${formatText(
        baseline.nodeModulesBytes,
        candidate.nodeModulesBytes,
        true,
        0
      )}`
  );
}

function outputToConsole(result: Result): void {
  const inputStats = [
    `Num. Files: ${result.data.files}`,
    `Total size: ${formatBytes(result.data.totalBytes)}`,
    `ESM: ${formatBytes(result.data.esmBytes)}`,
    `CJS: ${formatBytes(result.data.cjsBytes)}`,
    `Other: ${formatBytes(result.data.otherBytes)}`,
    `Num. Node modules: ${result.data.nodeModules}`,
    `Node modules size: ${formatBytes(result.data.nodeModulesBytes)}`,
  ];

  const outputStats = [
    `Num. Files: ${result.data.countOut}`,
    `Total size: ${formatBytes(result.data.bytesOut)}`,
  ];

  info(
    "Analysis result:\n" +
      "Input stats:\n" +
      inputStats.map((stat) => `  ${stat}`).join("\n") +
      "\n" +
      "Output stats:\n" +
      outputStats.map((stat) => `  ${stat}`).join("\n") +
      "\n" +
      `3G download time: ${formatTime(result.slowDownloadTime)}\n` +
      `4G download time: ${formatTime(result.fastDownloadTime)}\n` +
      `Average file size: ${formatBytes(result.avgFileSize)}\n` +
      `Average file size (node_modules): ${formatBytes(
        result.avgFileSizeNodeModules,
        0
      )}`
  );
}

function outputJSON(result: Result, jsonPath: string): void {
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  info(`Analysis written to ${jsonPath}`);
}

/**
 * Outputs a simple analysis of the esbuild metafile
 * to either the console or a JSON file.
 *
 * @param result The result object to output
 * @param jsonPath The path to the JSON file containing the analysis result
 */
export function output(result: Result, jsonPath?: string): void {
  if (jsonPath !== undefined) {
    outputJSON(result, jsonPath);
  } else {
    outputToConsole(result);
  }
}

/**
 * Outputs why and how a duplicated file is being included in the bundle.
 *
 * @param paths List of duplicated files in the bundle and their
 * import paths all the way to the entry point
 * @param namespace The namespace to remove from the file paths
 */
export function outputWhyDuplicateInBundle(
  paths: Path[],
  namespace: string
): void {
  const cachedPaths: Record<string, string> = {};

  for (const path of paths) {
    let lastItem = path[0];
    let index = 0;

    for (let file in path) {
      const item = path[file];
      lastItem = item;
      file = file.replace(namespace, "");

      if (!index) {
        info(packageRelativePath(file, cachedPaths));
      }

      info(
        `${"    ".repeat(index)}└── ${packageRelativePath(file, cachedPaths)}`
      );

      index += 1;
    }

    if (lastItem?.import?.input) {
      info(
        `${"    ".repeat(index)}└── ${packageRelativePath(
          lastItem?.import?.input.replace(namespace, ""),
          cachedPaths
        )}\n`
      );
    }
  }
}
