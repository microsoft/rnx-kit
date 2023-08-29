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

function getLine(
  filePath: string,
  keyword: string,
  src?: string,
  dest?: string
): string {
  try {
    const file = fs.readFileSync(filePath, "utf-8");
    const lineNumber = file.split("\n").findIndex((line) => {
      const result = line.includes(keyword);
      if (result) return true;

      if (src && dest && line.includes(`/${dest}/`)) {
        return line.replace(`/${dest}/`, `/${src}/`).includes(keyword);
      }

      return false;
    });

    return lineNumber >= 0 ? (lineNumber + 1).toString() : "";
  } catch (err) {
    return "";
  }
}

export function removeNamespace(filePath: string): string {
  const match = filePath.match(/((\b[A-Za-z]:)?[^:]*)$/);
  if (!match) return filePath;

  return match[0];
}

/**
 * Returns a relative path without the namespace.
 */
function getSimplePath(file: string): string {
  if (!file.startsWith("..")) {
    file = removeNamespace(file);
  }

  return path.relative(process.cwd(), file);
}

/**
 * Transforms a esbuild metafile into a webpack stats file.
 *
 * @param metafilePath The path to the esbuild metafile
 * @param skipLineNumber Whether to skip the line number in the webpack stats output
 * @param statsPath The path to the webpack stats file
 * @param graph Module object containing all the entry points and imports
 */
export function transform(
  metafilePath: string,
  skipLineNumber: boolean,
  statsPath?: string,
  graph?: Graph,
  src?: string,
  dest?: string
): WebpackStats | null {
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
          name: getSimplePath(name),
        });
      }

      for (const input in inputs) {
        for (const imp of inputs[input].imports) {
          if (imp.path === inputFile) {
            reasons.push({
              type: inputs[input].format === "esm" ? "harmony" : "cjs",
              module: input,
              moduleName: getSimplePath(input),
              userRequest: imp.original,
              loc:
                !skipLineNumber && imp.original
                  ? getLine(removeNamespace(input), imp.original, src, dest)
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

  if (!statsPath) {
    return webpack;
  } else {
    fs.writeFileSync(statsPath, JSON.stringify(webpack));
    info(`Webpack stats file written to ${statsPath}`);
    return null;
  }
}
