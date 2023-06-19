import fs from "fs";
import * as path from "path";
import { filesToSkip } from "./constants.js";
import { generateGraph, getWhyFileInBundle } from "./duplicates.js";
import type { Metafile } from "./metafile.js";
import type {
  Graph,
  StatsModuleIssuer,
  StatsModuleReason,
  WebpackStats,
} from "./types.js";
import { info } from "@rnx-kit/console";

// TODO: Improve...
function getLine(filePath: string, keyword?: string): string {
  if (!filePath || !keyword) return "";

  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const lineNumber = file.split("\n").findIndex((line) => {
      const result = line.includes(keyword);

      if (!result && keyword.includes("/src/index.ts")) {
        return line.includes(keyword.split("/src/index.ts")[0]);
      }

      if (!result && line.includes("lib")) {
        return line
          .replace("lib", "src")
          .replace(".js", ".ts")
          .includes(keyword);
      }

      return result;
    });

    return lineNumber !== -1 ? (lineNumber + 1).toString() : "";
  } catch (err) {
    return "";
  }
}

/** Returns a simpler and more readable path which starts from node_modules, e.g.:
 * ../../.store/@test-library@0.0.1-b55dbe3d1aed7a6c074d/node_modules/@test-library/a/b/test.js
 * becomes node_modules/@test-library/a/b/test.js
 */
function getSimplePath(dir: string, file: string): string {
  return file.includes("node_modules")
    ? "node_modules" + file.split("node_modules")[1]
    : path.relative(dir, file);
}

/**
 * Transforms a esbuild metafile into a webpack stats file.
 *
 * @param metafile The esbuild metafile
 * @param metafileDir Directory of the esbuild metafile
 * @param skipLineNumber Whether to skip the line number in the webpack stats output
 * @param statsPath The path to the webpack stats file
 * @param namespace The namespace to remove from every module to get cleaner output
 * @param graph Module object containing all the entry points and imports
 */
export function webpackStats(
  metafile: Metafile,
  metafileDir: string,
  skipLineNumber: boolean,
  statsPath: string,
  namespace: string,
  graph?: Graph
): void {
  if (!graph) graph = generateGraph(metafile);
  const { inputs, outputs } = metafile;
  const webpack: WebpackStats = {
    time: 0,
    builtAt: Date.now(),
    outputPath: path.resolve(metafileDir),
    chunks: [],
    modules: [],
    errors: [],
    warnings: [],
  };

  for (const file in outputs) {
    if (file.endsWith(".map")) continue;

    const output = outputs[file];
    const inputsInOutput = output.inputs;
    let id = 0;

    // TODO: Add support for multiple chunks
    webpack.chunks.push({
      entry: true,
      size: output.bytes,
      names: ["main"],
      id: 0,
      parents: [0],
    });

    for (const inputFile in inputsInOutput) {
      const inputFileClean = inputFile.replace(namespace, "");
      if (filesToSkip.includes(inputFileClean)) continue;

      const input = inputsInOutput[inputFile];
      const paths = getWhyFileInBundle(graph, inputFile);
      const reasons: StatsModuleReason[] = [];
      const issuers: StatsModuleIssuer[] = [];

      for (const p in paths) {
        issuers.push({
          name: getSimplePath(metafileDir, p.replace(namespace, "")),
        });
      }

      for (const input in inputs) {
        for (const imp of inputs[input].imports) {
          if (imp.path === inputFile) {
            const cleanInput = input.replace(namespace, "");

            reasons.push({
              type: inputs[input].format === "esm" ? "harmony" : "cjs",
              module: cleanInput,
              moduleName: getSimplePath(metafileDir, cleanInput),
              userRequest: imp.original,
              loc: !skipLineNumber ? getLine(cleanInput, imp.original) : "",
            });
          }
        }
      }

      webpack.modules.push({
        type: "module",
        identifier: inputFile,
        name: getSimplePath(metafileDir, inputFileClean),
        size: input.bytesInOutput,
        issuerPath: issuers,
        id: (id += 1),
        chunks: [0],
        reasons: reasons,
      });
    }
  }

  fs.writeFileSync(statsPath, JSON.stringify(webpack));
  info(`Webpack stats file written to ${statsPath}`);
}
