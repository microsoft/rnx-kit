import type { TransformOptions, TransformResult } from "esbuild";
import type {
  SourceTransformResult,
  TransformerArgs,
  TransformerContext,
} from "./types";
import { optionalModule } from "./utils";

export const esbuild = optionalModule<typeof import("esbuild")>("esbuild");

/**
 * @internal
 */
export function getTarget(options: TransformerArgs["options"]): string {
  const profile = options.unstable_transformProfile;
  if (profile === "hermes-canary" || profile === "hermes-stable") {
    // esbuild requires a versioned hermes target; use 0.12 as a conservative
    // baseline since the supported feature map (see getSupported) is what
    // actually controls which syntax is down-leveled.
    return "hermes0.14";
  }
  return "es2022";
}

/**
 * @internal
 */
export function getSupported(target: string): TransformOptions["supported"] {
  if (target.startsWith("hermes")) {
    return {
      "const-and-let": true,
      arrow: true,
      "default-argument": true,
      destructuring: true,
      generator: true,
      "rest-argument": true,
      "template-literal": true,
    };
  }
  return undefined;
}

export function srcTransformEsbuild({
  src,
  filename,
  options,
  context,
}: TransformerArgs): SourceTransformResult | Promise<SourceTransformResult> {
  // get the loader for the file, will be undefined if we should skip this file
  const { srcSyntax, asyncTransform, trace, handleJsx } = context;
  const target = getTarget(options);
  const jsx = handleJsx ? "automatic" : "preserve";
  const jsxDev = Boolean(handleJsx && options.dev);
  const esbuildOpName = "transform src esbuild";

  // set up the options
  const esbuildOptions: TransformOptions = {
    sourcefile: filename,
    loader: srcSyntax,
    target,
    supported: getSupported(target),
    jsx,
    jsxDev,
    define: { __DEV__: String(options.dev) },
    minify: false,
    sourcemap: true,
  };

  // do the actual transform
  if (asyncTransform) {
    const { transform } = esbuild.get();
    return trace(esbuildOpName, transform, src, esbuildOptions).then((result) =>
      resolveResult(result, context)
    );
  } else {
    const { transformSync } = esbuild.get();
    return resolveResult(
      trace(esbuildOpName, transformSync, src, esbuildOptions),
      context
    );
  }
}

function resolveResult(
  result: TransformResult,
  context: TransformerContext
): SourceTransformResult {
  const srcType = context.srcSyntax;
  if (srcType === "ts" || srcType === "tsx") {
    context.srcSyntax = srcType === "ts" ? "js" : "jsx";
  }
  return { code: result.code, map: result.map ? result.map : undefined };
}
