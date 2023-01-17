import { esbuildTransformerConfig } from "@rnx-kit/metro-serializer-esbuild";
import { transform as swcTransform } from "@swc/core";
import type { JsTransformOptions } from "metro-transform-worker";
import { transform as metroTransform } from "metro-transform-worker";
import DependencyCollector from "./DependencyCollector";

export { getCacheKey } from "metro-transform-worker";

const flowRemoveTypes = require("flow-remove-types");

const countLines = (() => {
  const reLine = /^/gm;
  return (str: string): number => str.match(reLine)?.length ?? 0;
})();

function isAsset(filename: string, options: JsTransformOptions): boolean {
  return filename.endsWith(".json") || options.type === "asset";
}

function isFlow(filename: string, data: string): boolean {
  return (
    // `react-native` doesn't mark all files with `@flow`. Just assume
    // everything is written in Flow.
    filename.includes("/react-native/") ||
    filename.includes("\\react-native\\") ||
    data.includes("@flow") ||
    data.includes("@noflow")
  );
}

export const transform: typeof metroTransform = async (
  config,
  projectRoot,
  filename,
  data,
  options
) => {
  if (config.minifierPath !== esbuildTransformerConfig.minifierPath) {
    const { name } = require("../package.json");
    throw new Error(
      `'${name}' requires '@rnx-kit/metro-serializer-esbuild' and it doesn't look like it's correctly set up. Please verify your 'metro.config.js' and try again.`
    );
  }

  if (isAsset(filename, options)) {
    return metroTransform(config, projectRoot, filename, data, options);
  }

  const rawInput = data.toString("utf-8");
  const input = isFlow(filename, rawInput)
    ? flowRemoveTypes(rawInput, { all: true }).toString()
    : rawInput;

  const isTSX = filename.endsWith(".tsx");

  const dependencyCollector = new DependencyCollector();
  const { code } = await swcTransform(input, {
    filename,
    swcrc: false,
    minify: false,
    sourceMaps: "inline",
    plugin: (m) => dependencyCollector.visitProgram(m),
    isModule: options.type !== "script",
    jsc: {
      parser:
        isTSX || filename.endsWith(".ts")
          ? { syntax: "typescript", tsx: isTSX }
          : { syntax: "ecmascript", jsx: true },
      transform: {
        optimizer: {
          globals: {
            vars: {
              __DEV__: JSON.stringify(Boolean(options.dev)),
              __METRO_GLOBAL_PREFIX__: "''",
            },
          },
        },
      },
      target: "es5",
    },
  });

  return {
    dependencies: dependencyCollector.dependencies,
    output: [
      {
        data: {
          code,
          lineCount: countLines(code),
          functionMap: null,
        },
        type: options.type === "script" ? "js/script" : "js/module",
      },
    ],
  };
};
