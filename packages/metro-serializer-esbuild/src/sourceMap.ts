import { findMetroPath } from "@rnx-kit/tools-react-native/metro";
import type { Module } from "metro";
import * as path from "path";

const sourceMappingOptions = {
  processModuleFilter: () => true,
  excludeSource: false,
  shouldAddToIgnoreList: () => false,
};

export function absolutizeSourceMap(outputPath: string, text: string): string {
  /**
   * All paths in the source map are relative to the directory
   * containing the source map.
   *
   * See https://esbuild.github.io/api/#source-root
   */
  const sourceRoot = path.dirname(outputPath);
  const sourcemap = JSON.parse(text);
  const sources = sourcemap.sources.map((file: string) =>
    file.startsWith("virtual:") ? file : path.resolve(sourceRoot, file)
  );

  return JSON.stringify({ ...sourcemap, sources });
}

export function getInlineSourceMappingURL(modules: readonly Module[]): string {
  const metroPath = findMetroPath() || "metro";
  const sourceMapString = require(
    `${metroPath}/src/DeltaBundler/Serializers/sourceMapString`
  );
  const sourceMap = sourceMapString(modules, sourceMappingOptions);
  const base64 = Buffer.from(sourceMap).toString("base64");
  return `data:application/json;charset=utf-8;base64,${base64}`;
}

export function generateSourceMappingURL(modules: readonly Module[]): string {
  return `//# sourceMappingURL=${getInlineSourceMappingURL(modules)}`;
}
