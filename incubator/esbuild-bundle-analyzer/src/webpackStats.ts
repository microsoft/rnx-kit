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

      if (keyword.endsWith(".ts") || keyword.endsWith(".js")) {
        keyword = keyword.slice(0, -3);
      }

      if (!result) {
        if (line.includes("/lib/")) {
          return line.replace("/lib/", "/src/").includes(keyword);
        } else if (line.includes("/dist/")) {
          return line.replace("/dist/", "/src/").includes(keyword);
        } else if (line.includes("/build/")) {
          return line.replace("/build/", "/src/").includes(keyword);
        } else {
          return false;
        }
      }

      return result;
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

  const patternsToRemove = [
    "/src/index.",
    "/lib/index.",
    "/dist/index.",
    "/build/index.",
  ];

  for (const pattern of patternsToRemove) {
    const index = userRequest.indexOf(pattern);
    if (index >= 0) {
      let extensionIndex = -1;
      let length = 3;

      if (userRequest.endsWith(".ts")) {
        extensionIndex = userRequest.indexOf(".ts", index);
      } else if (userRequest.endsWith(".js")) {
        extensionIndex = userRequest.indexOf(".js", index);
      } else if (userRequest.endsWith(".jsx")) {
        extensionIndex = userRequest.indexOf(".jsx", index);
        length = 4;
      } else if (userRequest.endsWith(".tsx")) {
        extensionIndex = userRequest.indexOf(".tsx", index);
        length = 4;
      }

      if (extensionIndex >= 0) {
        return (
          userRequest.slice(0, index) +
          userRequest.slice(extensionIndex + length)
        );
      }
    }
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
