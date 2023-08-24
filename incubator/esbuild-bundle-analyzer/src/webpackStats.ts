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
    const file = fs.readFileSync(path.resolve(filePath), "utf-8");
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

  const match = userRequest.match(patternToRemoveRegex);
  if (match) {
    return userRequest.replace(match[0], "");
  }

  return userRequest;
}

function removePrefix(filePath: string): string {
  let parts = filePath.split(":");

  while (parts.length > 1) {
    filePath = parts.slice(1).join(":");
    parts = filePath.split(":");
  }

  return filePath;
}

/**
 * Returns a simpler and more readable path which starts from node_modules
 * and removes the namespace prefix, e.g.:
 * namespace:user/x/.store/@test-library@0.0.1-b55dbe3d1aed7a6c074d/node_modules/@test-library/a/b/test.js
 * becomes node_modules/@test-library/a/b/test.js
 */
function getSimplePath(file: string): string {
  if (!file.startsWith("..")) {
    file = removePrefix(file);
  }

  const index = file.indexOf("node_modules");
  return index >= 0 ? file.slice(index) : path.relative(process.cwd(), file);
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

      for (const p in paths) {
        issuers.push({
          name: getSimplePath(p),
        });
      }

      for (const input in inputs) {
        for (const imp of inputs[input].imports) {
          if (imp.path === inputFile) {
            const userRequest = getCleanUserRequest(imp.original);
            reasons.push({
              type: inputs[input].format === "esm" ? "harmony" : "cjs",
              module: input,
              moduleName: getSimplePath(input),
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
        name: getSimplePath(inputFile),
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
