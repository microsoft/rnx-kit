import type { BabelFileResult } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import path from "node:path";
import { createCacheKey } from "./createCacheKey";
import { transformFinal } from "./transformFinal";
import { transformSrcEsbuild, updateOptions } from "./transformSrcEsbuild";
import { transformSrcSvg } from "./transformSrcSvg";
import type {
  TransformerPluginOptions,
  UpstreamTransformer,
  TransformerModule,
  SourceTransformer,
  FilePluginOptions,
} from "./types";
import { isPromiseLike, lazyInit } from "./utils";
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
function getUpstreamTransformer(
  filename: string,
  { upstreamDelegates }: TransformerPluginOptions
): UpstreamTransformer {
  if (upstreamDelegates) {
    const ext = path.extname(filename).toLowerCase();
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
function getFrontEndTransformer(
  filename: string,
  pluginOptions: FilePluginOptions
): SourceTransformer | undefined {
  if (pluginOptions.handleSvg && filename.toLowerCase().endsWith(".svg")) {
    return transformSrcSvg;
  } else if (pluginOptions.loader) {
    return transformSrcEsbuild;
  }
  return undefined;
}

/**
 * Transforms the given source code using the appropriate transformers.
 * @param { src, filename, options, plugins } Babel transformer arguments
 * @returns The transformed Babel file result or a promise that resolves to it
 */
export function transform({
  src,
  filename,
  options,
  plugins,
}: BabelTransformerArgs): BabelFileResult | Promise<BabelFileResult> {
  const args = {
    src,
    filename,
    options,
    plugins,
    pluginOptions: updateOptions(getPluginOptions(), filename),
  };

  // get the appropriate transformers for this file
  const finalTransform = getUpstreamTransformer(filename, args.pluginOptions);
  const sourceTransform = getFrontEndTransformer(filename, args.pluginOptions);

  // if there is a source transformer, either typescript or svg, run it first and pass the results to the final transformer
  if (sourceTransform) {
    // get the result, may be a promise or not
    const srcResult = sourceTransform(args);
    // if it's a promise, this function will run asynchronously so yield execution to wait for the result
    if (isPromiseLike(srcResult)) {
      return srcResult.then((resolvedSrc) => {
        args.src = resolvedSrc;
        return finalTransform(args);
      });
    } else {
      // synchronus case, just update the args immediately and continue with the final transform
      args.src = srcResult;
    }
  }

  // return the final transform, which may be a promise but transform handles both cases internally
  return finalTransform(args);
}
