import type { SrcSyntax } from "@rnx-kit/tools-babel";
import { getTrace } from "@rnx-kit/tools-performance";
import type { JscConfig, Options as SwcOptions, Output } from "@swc/core";
import type {
  NativeTarget,
  SourceTransformer,
  SourceTransformResult,
  TransformerArgs,
  TransformerContext,
} from "./types.ts";
import { optionalModule } from "./utils.ts";

const DEFAULT_TARGET: NativeTarget = "es2022";
const SUPPORTED_TARGETS: ReadonlySet<NativeTarget> = new Set<NativeTarget>([
  "es2017",
  "es2020",
  "es2022",
]);
let warnedAboutInvalidTarget = false;

/**
 * Resolve a `target` value coming from plugin options into a value SWC accepts.
 * Falls back to the default with a one-time `console.warn` when an unknown
 * value sneaks through (TypeScript will catch most mistakes, but JSON read from
 * an environment variable cannot be type-checked).
 */
function resolveTarget(target: unknown): NativeTarget {
  if (
    typeof target === "string" &&
    SUPPORTED_TARGETS.has(target as NativeTarget)
  ) {
    return target as NativeTarget;
  }
  if (target !== undefined && !warnedAboutInvalidTarget) {
    warnedAboutInvalidTarget = true;
    console.warn(
      `@rnx-kit/metro-transformer-native: ignoring unknown target ${JSON.stringify(target)}, falling back to "${DEFAULT_TARGET}"`
    );
  }
  return DEFAULT_TARGET;
}

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
  const { srcSyntax, handleJsx, handleModules, target } = context;
  const { experimentalImportSupport } = options;
  const jsxTransform =
    handleJsx && (srcSyntax === "tsx" || srcSyntax === "jsx");

  // Module setting precedence:
  //   - experimentalImportSupport: SWC emits ES modules (Metro will handle the rest)
  //   - handleModules: SWC emits CommonJS
  //   - neither: leave modules alone, let Babel's transform-modules-commonjs handle it
  const swcModule: SwcOptions["module"] = experimentalImportSupport
    ? { type: "es6" }
    : handleModules
      ? { type: "commonjs", strict: true, strictMode: true }
      : undefined;

  return {
    filename,
    sourceFileName: filename,
    jsc: {
      parser: getParserConfig(srcSyntax),
      target: resolveTarget(target),
      transform: {
        react: jsxTransform
          ? {
              runtime: "automatic",
              development: Boolean(options.dev),
            }
          : undefined,
      },
    },
    ...(swcModule ? { module: swcModule } : {}),
    // Note: sourceMaps deliberately omitted. Metro's metro-transform-worker
    // ignores the `map` field returned from a babel transformer — source-map
    // mappings are reconstructed downstream from AST `loc` properties. See
    // the comment in babelTransformer.ts::applySourceResult for details.
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
  return { code: result.code };
}
