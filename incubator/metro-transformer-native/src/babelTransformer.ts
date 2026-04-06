import type { BabelFileResult } from "@babel/core";
import { isPromiseLike, lazyInit } from "@rnx-kit/reporter";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import crypto from "node:crypto";
import fs from "node:fs";
import { getPluginOptions, getTransformerArgs } from "./context";
import { transformFinal } from "./finalTransformer";
import { srcTransformEsbuild } from "./srcTransformEsbuild";
import { srcTransformSvg } from "./srcTransformSvg";
import { srcTransformSwc } from "./srcTransformSwc";
import type {
  UpstreamTransformer,
  TransformerModule,
  SourceTransformer,
  TransformerArgs,
  SourceTransformResult,
  TransformerContext,
} from "./types";
import { toArray } from "./utils";

/**
 * Files in this package to include in the hash for the cache key.
 */
const packageFiles = [
  "babelTransformer",
  "finalTransformer",
  "index",
  "srcTransformEsbuild",
  "srcTransformSvg",
  "srcTransformSwc",
  "types",
  "utils",
];

/**
 * Cached cache key, calculated from the plugin options and contents of this package
 */
export const getCacheKey = lazyInit(() => {
  const options = getPluginOptions();
  const hash = crypto.createHash("sha256");
  // encode the options into the hash, this will ensure that changes to the options will invalidate the cache
  hash.update(JSON.stringify(options));
  // read this file and other package files to get a key that will change when the files in the package change.
  for (const file of packageFiles) {
    hash.update(fs.readFileSync(require.resolve(`./${file}`), "utf8"));
  }
  // return the digested hash as the cache key
  return hash.digest("hex");
});

/**
 * Cached lookup for the upstream transformer for a given file type
 */
function getUpstreamTransformer({
  upstreamDelegates,
  ext,
}: TransformerContext): UpstreamTransformer {
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
  engine,
  ext,
  handleSvg,
  nativeTransform,
}: TransformerContext): SourceTransformer | undefined {
  if (handleSvg && ext === ".svg") {
    return srcTransformSvg;
  } else if (nativeTransform) {
    return engine === "swc" ? srcTransformSwc : srcTransformEsbuild;
  }
  return undefined;
}

function applySourceResult(
  result: SourceTransformResult,
  args: TransformerArgs
) {
  args.src = result.code;
  if (result.map) {
    args.context.map = result.map;
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
  const args = getTransformerArgs(baseArgs);
  if (!args) {
    throw new Error(
      `Failed to load babel config for file ${baseArgs.filename}`
    );
  }
  return args.context.trace("transform core", transformWorker, args);
}

function transformWorker(
  args: TransformerArgs
): BabelFileResult | Promise<BabelFileResult> {
  const context = args.context;
  const trace = context.trace;
  const upstreamOp = "transform babel upstream";

  // get the appropriate transformers for this file
  const upstreamTransform = getUpstreamTransformer(context);
  const sourceTransform = getSourceTransformer(context);

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
