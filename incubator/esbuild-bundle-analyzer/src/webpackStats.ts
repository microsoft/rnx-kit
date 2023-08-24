import { info } from "@rnx-kit/console";
import fs from "fs";
import * as path from "path";
import { readMetafile } from "./compare";
import { generateGraph, getWhyFileInBundle } from "./duplicates";
import type {
  Graph,
  StatsModuleIssuer,
  StatsModuleReason,
  WebpackStats,
} from "./types";

function getLine(filePath: string, keyword: string): string {
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const lineNumber = file.split("\n").findIndex((line) => {
      const result = line.includes(keyword);
      if (result) return true;

      const extensionsToRemove = [".ts", ".js", ".tsx", ".jsx", ".mjs", ".cjs"];
      for (const extension of extensionsToRemove) {
        if (keyword.endsWith(extension)) {
          keyword = keyword.slice(0, -extension.length);
          break;
        }
      }

      // Check if the import is nested, e.g.:
      // import { ensureDir } from "@rnx-kit/cli/bundle/metro";
      if (line.includes("/lib/")) {
        return line.replace("/lib/", "/src/").includes(keyword);
      } else if (line.includes("/dist/")) {
        return line.replace("/dist/", "/src/").includes(keyword);
      } else if (line.includes("/build/")) {
        return line.replace("/build/", "/src/").includes(keyword);
      } else {
        return false;
      }
    });

    return lineNumber >= 0 ? (lineNumber + 1).toString() : "";
  } catch (err) {
    return "";
  }
}

/**
 * Returns a cleaner userRequest by removing the src/index.ts(x) and lib/index.js(x)
 * from the import path.
 */
export function getCleanUserRequest(userRequest?: string): string {
  if (!userRequest) return "";

  const patternToRemoveRegex =
    /\/(src|lib|dist|build)\/index(\.[^.]+)?(\.[^.]+)?$/;

  return userRequest.replace(patternToRemoveRegex, "");
}

export function removePrefix(filePath: string): string {
  const lastColonIndex = filePath.lastIndexOf(":");
  return lastColonIndex < 0 ? filePath : filePath.slice(lastColonIndex + 1);
}

/**
 * Transforms a esbuild metafile into a webpack stats file.
 *
 * @param metafilePath The path to the esbuild metafile
 * @param statsPath The path to the webpack stats file
 * @param skipLineNumber Whether to skip the line number in the webpack stats output
 * @param graph Module object containing all the entry points and imports
 */
export function webpackStats(
  metafilePath: string,
  statsPath: string,
  skipLineNumber: boolean,
  graph?: Graph
): void {
  const metafile = readMetafile(metafilePath);
  if (!graph) graph = generateGraph(metafile);
  const { inputs, outputs } = metafile;
  const webpack: WebpackStats = {
    time: 0,
    builtAt: Date.now(),
    outputPath: path.resolve(metafilePath),
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
    let chunkId = 0;

    webpack.chunks.push({
      entry: true,
      size: output.bytes,
      names: ["main"],
      id: chunkId,
      parents: [chunkId],
    });

    for (const inputFile in inputsInOutput) {
      const input = inputsInOutput[inputFile];
      const paths = getWhyFileInBundle(graph, inputFile);
      const reasons: StatsModuleReason[] = [];
      const issuers: StatsModuleIssuer[] = [];

      for (const name in paths) {
        issuers.push({
          name,
        });
      }

      for (const input in inputs) {
        for (const imp of inputs[input].imports) {
          if (imp.path === inputFile) {
            const userRequest = getCleanUserRequest(imp.original);
            reasons.push({
              type: inputs[input].format === "esm" ? "harmony" : "cjs",
              module: input,
              moduleName: input,
              userRequest,
              loc:
                !skipLineNumber && imp.original
                  ? getLine(removePrefix(input), userRequest)
                  : "",
            });
          }
        }
      }

      webpack.modules.push({
        type: "module",
        identifier: inputFile,
        name: inputFile,
        size: input.bytesInOutput,
        issuerPath: issuers,
        id: (id += 1),
        chunks: [chunkId],
        reasons: reasons,
      });
    }

    chunkId += 1;
  }

  fs.writeFileSync(statsPath, JSON.stringify(webpack));
  info(`Webpack stats file written to ${statsPath}`);
}
