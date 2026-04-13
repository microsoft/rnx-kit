import type { SrcSyntax } from "@rnx-kit/tools-babel";
import { getTrace } from "@rnx-kit/tools-performance";
import type { JscConfig, Options as SwcOptions, Output } from "@swc/core";
import type {
  SourceTransformer,
  SourceTransformResult,
  TransformerArgs,
  TransformerContext,
} from "./types";
import { optionalModule } from "./utils";

/**
 * Get the SWC parser configuration based on the file's loader type.
 */
function getParserConfig(srcSyntax: SrcSyntax): JscConfig["parser"] {
  switch (srcSyntax) {
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
  const { filename, options, context } = args;
  const { srcSyntax, handleJsx } = context;
  const { experimentalImportSupport } = options;
  const jsxTransform =
    handleJsx && (srcSyntax === "tsx" || srcSyntax === "jsx");

  return {
    filename,
    sourceFileName: filename,
    jsc: {
      parser: getParserConfig(srcSyntax),
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
    module: experimentalImportSupport
      ? { type: "es6" }
      : { type: "commonjs", strict: true, strictMode: true },
    sourceMaps: true,
    isModule: true,
  };
}

const swcOpName = "transform src swc";

export const srcTransformSwc: SourceTransformer = (args: TransformerArgs) => {
  const { context, src } = args;
  const { asyncTransform } = context;
  const trace = getTrace("transform");
  const swcOptions = getSwcOptions(args);
  // return null on parse errors to fall through to Babel
  if (asyncTransform) {
    const { transform } = swcCore.get();
    return trace(swcOpName, transform, src, swcOptions).then(
      (result: Output) => handleSwcResult(result, context),
      () => null
    );
  } else {
    try {
      const { transformSync } = swcCore.get();
      return handleSwcResult(
        trace(swcOpName, transformSync, src, swcOptions),
        context
      );
    } catch {
      return null;
    }
  }
};

function handleSwcResult(
  result: Output,
  context: TransformerContext
): SourceTransformResult {
  const srcType = context.srcSyntax;
  if (srcType === "ts" || srcType === "tsx") {
    context.srcSyntax = srcType === "ts" ? "js" : "jsx";
  } else {
    context.mayContainFlow = false;
  }
  return { code: result.code, map: result.map };
}
