import type { SrcSyntax } from "@rnx-kit/tools-babel";
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
    module: { type: "nodenext" },
    sourceMaps: true,
    isModule: true,
  };
}

const swcOpName = "transform src swc";

export const srcTransformSwc: SourceTransformer = (args: TransformerArgs) => {
  const { context, src } = args;
  const { trace, asyncTransform } = context;
  const swcOptions = getSwcOptions(args);
  if (asyncTransform) {
    const { transform } = swcCore.get();
    return trace(swcOpName, transform, src, swcOptions).then((result) =>
      handleSwcResult(result, context)
    );
  } else {
    const { transformSync } = swcCore.get();
    return handleSwcResult(
      trace(swcOpName, transformSync, src, swcOptions),
      context
    );
  }
};

function handleSwcResult(
  result: Output,
  context: TransformerContext
): SourceTransformResult {
  const srcType = context.srcSyntax;
  if (srcType === "ts" || srcType === "tsx") {
    context.srcSyntax = srcType === "ts" ? "js" : "jsx";
  }
  // SWC's handling of TypeScript is not always fully compatible with Babel's, so we need to do an additional pass through Babel to handle any syntax that SWC doesn't support or doesn't transform in the same way.
  return { code: result.code, map: result.map };
}
