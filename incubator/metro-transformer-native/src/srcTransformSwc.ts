import type { JscConfig, Options as SwcOptions, Output } from "@swc/core";
import type {
  FilePluginOptions,
  SourceTransformer,
  SourceTransformResult,
  TransformerArgs,
} from "./types";
import { optionalModule } from "./utils";

/**
 * Get the SWC parser configuration based on the file's loader type.
 */
function getParserConfig(loader: string): JscConfig["parser"] {
  switch (loader) {
    case "tsx":
      return { syntax: "typescript", tsx: true };
    case "ts":
      return { syntax: "typescript", tsx: false };
    case "jsx":
      return { syntax: "ecmascript", jsx: true };
    case "js":
    default:
      return { syntax: "ecmascript", jsx: false };
  }
}

export const swcCore = optionalModule<typeof import("@swc/core")>("@swc/core");

function getSwcOptions(args: TransformerArgs): SwcOptions {
  const { filename, options, pluginOptions } = args;
  const { loader, mode } = pluginOptions;
  const jsxTransform = mode.jsx === "native";

  return {
    filename,
    sourceFileName: filename,
    jsc: {
      parser: getParserConfig(loader!),
      target: "es2022",
      transform: {
        react: jsxTransform
          ? {
              runtime: "automatic",
              development: Boolean(options.dev),
            }
          : undefined,
      },
    },
    module: { type: "nodenext" },
    sourceMaps: true,
    isModule: true,
  };
}

const swcOpName = "transform src swc";

export const srcTransformSwc: SourceTransformer = (args: TransformerArgs) => {
  const { pluginOptions, src } = args;
  const { loader, trace, asyncTransform } = pluginOptions;
  if (!loader) {
    return { code: src };
  }
  const swcOptions = getSwcOptions(args);
  if (asyncTransform) {
    const { transform } = swcCore.get();
    return trace(swcOpName, transform, src, swcOptions).then((result) =>
      handleSwcResult(result, pluginOptions)
    );
  } else {
    const { transformSync } = swcCore.get();
    return handleSwcResult(
      trace(swcOpName, transformSync, src, swcOptions),
      pluginOptions
    );
  }
};

function handleSwcResult(
  result: Output,
  pluginOptions: FilePluginOptions
): SourceTransformResult {
  const srcType = pluginOptions.srcType;
  if (srcType === "ts" || srcType === "tsx") {
    pluginOptions.srcType = srcType === "ts" ? "js" : "jsx";
  }
  // SWC's handling of TypeScript is not always fully compatible with Babel's, so we need to do an additional pass through Babel to handle any syntax that SWC doesn't support or doesn't transform in the same way.
  return { code: result.code, map: result.map };
}
