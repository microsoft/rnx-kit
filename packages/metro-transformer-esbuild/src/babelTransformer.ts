import type { BabelFileResult } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import { createCacheKey } from "./createCacheKey";
import { transformFinal } from "./finalTransformer";
import { srcTransformEsbuild } from "./srcTransformEsbuild";
import { srcTransformSvg } from "./srcTransformSvg";
import { srcTransformSwc } from "./srcTransformSwc";
import type {
  UpstreamTransformer,
  TransformerModule,
  SourceTransformer,
  FilePluginOptions,
  TransformerArgs,
  SourceTransformResult,
} from "./types";
import { isPromiseLike, lazyInit, resolveFileOptions } from "./utils";
import { getTransformerPluginOptions, toArray } from "./utils";

/**
 * Cached options, obtained from the environment on demand
 */
const getPluginOptions = lazyInit(() => getTransformerPluginOptions());

/**
 * Cached cache key, calculated from the plugin options and contents of this package
 */
export const getCacheKey = lazyInit(() => createCacheKey(getPluginOptions()));

/**
 * Cached lookup for the upstream transformer for a given file type
 */
function getUpstreamTransformer({
  upstreamDelegates,
  ext,
}: FilePluginOptions): UpstreamTransformer {
  if (upstreamDelegates) {
    for (const delegatePath of Object.keys(upstreamDelegates)) {
      const patterns = toArray(upstreamDelegates[delegatePath]);
      for (const pattern of patterns) {
        if (ext === pattern) {
          const { transform } = require(delegatePath) as TransformerModule;
          return transform;
        }
      }
    }
  }
  return transformFinal;
}

/**
 * Get the front-end transformer to use for a given file, if any.
 */
function getSourceTransformer({
  ext,
  loader,
  handleSvg,
  mode,
}: FilePluginOptions): SourceTransformer | undefined {
  if (handleSvg && ext === ".svg") {
    return srcTransformSvg;
  } else if (loader) {
    return mode.engine === "swc" ? srcTransformSwc : srcTransformEsbuild;
  }
  return undefined;
}

function applySourceResult(
  result: SourceTransformResult,
  args: TransformerArgs
) {
  args.src = result.code;
  if (result.map) {
    args.map = result.map;
  }
  return args;
}

/**
 * Transforms the given source code using the appropriate transformers.
 * @param { src, filename, options, plugins } Babel transformer arguments
 * @returns The transformed Babel file result or a promise that resolves to it
 */
export function transform(
  baseArgs: BabelTransformerArgs
): BabelFileResult | Promise<BabelFileResult> {
  // get options from the environment, then combine with the babel args to get the full plugin options for this file
  const baseOptions = getPluginOptions();
  const pluginOptions = resolveFileOptions(baseArgs, baseOptions);
  const args: TransformerArgs = { ...baseArgs, pluginOptions };
  return pluginOptions.trace("transform core", transformWorker, args);
}

function transformWorker(
  args: TransformerArgs
): BabelFileResult | Promise<BabelFileResult> {
  const pluginOptions = args.pluginOptions;
  const trace = pluginOptions.trace;
  const upstreamOp = "transform babel upstream";

  // get the appropriate transformers for this file
  const upstreamTransform = getUpstreamTransformer(pluginOptions);
  const sourceTransform = getSourceTransformer(pluginOptions);

  // if there is a source transformer, either typescript or svg, run it first and pass the results to the final transformer
  if (sourceTransform) {
    // get the result, may be a promise or not
    const srcResult = sourceTransform(args);
    // if it's a promise, this function will run asynchronously so yield execution to wait for the result
    if (isPromiseLike(srcResult)) {
      return srcResult.then((result) =>
        trace(upstreamOp, upstreamTransform, applySourceResult(result, args))
      );
    } else {
      // synchronus case, just update the args immediately and continue with the final transform
      applySourceResult(srcResult, args);
    }
  }

  // return the final transform, which may be a promise but transform handles both cases internally
  return trace(upstreamOp, upstreamTransform, args);
}
