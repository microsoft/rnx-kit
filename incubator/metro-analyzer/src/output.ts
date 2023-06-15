import chalk from "chalk";
import fs from "fs";
import { VIRTUAL_PREFIX } from "./constants.js";
import type { Duplicate, Path, Result, Stats } from "./types.js";
import { error, info } from "@rnx-kit/console";

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

/**
 * Outputs the difference between the baseline and candidate statistics to the console.
 *
 * @param baseline The baseline statistics
 * @param candidate The candidate statistics
 */
export function outputDiffToConsole(baseline: Stats, candidate: Stats): void {
  if (!baseline || !candidate) {
    error("Invalid input parameters");
    return;
  }

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
      `Build time: ${result.buildTime} s\n` +
      `Download time: ${result.downloadTime} s\n` +
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
 * Outputs a list of duplicate dependencies to the console.
 *
 * @param duplicates  List of duplicate dependencies in the bundle
 */
export function outputDuplicates(duplicates: Duplicate[]): void {
  info(`Found ${duplicates.length} duplicate dependencies:`);
  for (const duplicate of duplicates) {
    const { module, copies, versions } = duplicate;
    console.log(
      `The dependency ${module} resolves to ${copies} files in the bundle:`
    );

    for (const version in versions) {
      for (const path of versions[version]) {
        console.log(` - ${path}`);
      }
    }
    console.log();
  }
}

/**
 * Outputs why and how a duplicated file is being included in the bundle.
 *
 * @param paths List of duplicated files in the bundle and their
 * import paths all the way to the entry point.
 */
export function outputWhyDuplicateInBundle(paths: Path[]): void {
  for (const path of paths) {
    let first = true;
    let lastItem = path[0];

    for (const i in path) {
      const item = path[i];
      lastItem = item;

      if (first) {
        info(
          `Entry point ${item?.input.replace(
            VIRTUAL_PREFIX,
            ""
          )} contains:\n   import "${item?.import?.original}";  \u2935`
        );

        first = false;
        continue;
      }

      let type = "";
      switch (item?.import?.kind) {
        case "import-statement":
          type = "Imported file";
          break;
        case "require-call":
          type = "Required file";
          break;
        case "dynamic-import":
          type = "Dynamically-imported file";
          break;
        case "import-rule":
          type = "Imported stylesheet file";
          break;
        case "url-token":
          type = "URL reference file";
          break;
        default:
          throw new Error(`Invalid import kind: ${item?.import?.kind}`);
      }

      console.log(
        `${type} ${i.replace(VIRTUAL_PREFIX, "")} contains:\n   import "${
          item?.import?.original
        }";  \u2935`
      );
    }

    console.log(
      `Which is how the file (${lastItem?.import?.input.replace(
        VIRTUAL_PREFIX,
        ""
      )}) ended up in the bundle.\n`
    );
  }
}
