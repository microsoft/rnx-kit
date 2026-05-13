import type { BabelFileResult } from "@babel/core";
import { isPromiseLike, lazyInit } from "@rnx-kit/reporter";
import type { BabelTransformerArgs as MetroBabelTransformerArgs } from "@rnx-kit/tools-babel";
import { getTrace } from "@rnx-kit/tools-performance";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getPluginOptions, getTransformerArgs } from "./context";
import { transformFinal } from "./finalTransformer";
import { srcTransformSvg } from "./srcTransformSvg";
import { srcTransformSwc } from "./srcTransformSwc";
import type {
  UpstreamTransformer,
  TransformerModule,
  SourceTransformer,
  TransformerArgs,
  SourceTransformResult,
  TransformerContext,
  TransformerOptions,
} from "./types";
import { toArray } from "./utils";

/**
 * Process-local memoization for resolved upstream delegates. Keyed by the
 * `transformerPath` string supplied by the consumer; each delegate is
 * `require()`-ed at most once per process.
 */
const delegateCache = new Map<string, UpstreamTransformer>();

const packageDir = __dirname;

/**
 * Files in this package to include in the hash for the cache key. We scan
 * the directory at startup rather than using a static list so a renamed or
 * added source file does not silently invalidate the cache calculation
 * (the previous static list referenced a file that no longer exists, which
 * would have thrown MODULE_NOT_FOUND at the first getCacheKey() call).
 *
 * The list is sorted for deterministic ordering across platforms — Metro's
 * cache key MUST be stable for identical inputs.
 */
const packageFiles = fs
  .readdirSync(packageDir)
  .filter((f) => f.endsWith(".js"))
  .sort();

/**
 * Compute a cache key from the supplied options and the current contents of
 * this package's compiled source files. Exposed as a pure helper so tests can
 * verify options-sensitivity without re-requiring the module to defeat the
 * lazyInit cache on `getCacheKey`.
 */
export function computeCacheKey(options: Partial<TransformerOptions>): string {
  const hash = crypto.createHash("sha256");
  // encode the options into the hash, this will ensure that changes to the options will invalidate the cache
  hash.update(JSON.stringify(options));
  // fold the package version in so a version bump invalidates caches automatically
  hash.update(require("../package.json").version);
  // read this file and other package files to get a key that will change when the files in the package change.
  for (const file of packageFiles) {
    hash.update(fs.readFileSync(path.join(packageDir, file), "utf8"));
  }
  // return the digested hash as the cache key
  return hash.digest("hex");
}

/**
 * Cached cache key, calculated from the plugin options and contents of this package
 */
export const getCacheKey = lazyInit(() => computeCacheKey(getPluginOptions()));

/**
 * Resolve a delegate's `transformerPath` to a function. Supports three path
 * shapes:
 *
 * - Absolute paths — resolved as-is.
 * - Relative paths (start with `.`) — resolved against `process.cwd()` so a
 *   consumer can write `"./my-transformers/json.js"` and have it resolved
 *   relative to the project root rather than this package's `__dirname`.
 * - Bare specifiers — resolved with `process.cwd()` on the lookup paths so
 *   the consumer's `node_modules` is searched, not just this package's.
 *
 * Resolution failures and modules missing a `transform` export both throw
 * with a message naming the delegate path and the offending filename.
 */
function resolveDelegate(
  delegatePath: string,
  filename: string
): UpstreamTransformer {
  const cached = delegateCache.get(delegatePath);
  if (cached) return cached;

  let resolved: string;
  try {
    if (path.isAbsolute(delegatePath)) {
      resolved = require.resolve(delegatePath);
    } else if (delegatePath.startsWith(".")) {
      resolved = require.resolve(path.resolve(process.cwd(), delegatePath));
    } else {
      resolved = require.resolve(delegatePath, { paths: [process.cwd()] });
    }
  } catch {
    throw new Error(
      `@rnx-kit/metro-transformer-native: failed to resolve upstream delegate "${delegatePath}" for file "${filename}".`
    );
  }

  const mod = require(resolved) as TransformerModule;
  if (typeof mod?.transform !== "function") {
    throw new Error(
      `@rnx-kit/metro-transformer-native: upstream delegate "${delegatePath}" does not export a transform function.`
    );
  }
  delegateCache.set(delegatePath, mod.transform);
  return mod.transform;
}

/**
 * Find the upstream transformer to use for a given file. Iterates the
 * configured `upstreamDelegates` array in order and returns the first match;
 * falls back to the built-in `transformFinal` when nothing matches.
 */
function getUpstreamTransformer(
  { upstreamDelegates, ext }: TransformerContext,
  filename: string
): UpstreamTransformer {
  if (upstreamDelegates) {
    for (const { transformerPath, extensions } of upstreamDelegates) {
      const exts = toArray(extensions);
      if (exts.includes(ext)) {
        return resolveDelegate(transformerPath, filename);
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
  handleSvg,
  nativeTransform,
}: TransformerContext): SourceTransformer | undefined {
  if (handleSvg && ext === ".svg") {
    return srcTransformSvg;
  } else if (nativeTransform) {
    return srcTransformSwc;
  }
  return undefined;
}

function applySourceResult(
  result: SourceTransformResult,
  args: TransformerArgs
) {
  args.src = result.code;
  // NOTE: deliberately not propagating result.map onto args.context.map.
  // Metro's metro-transform-worker only reads `ast` and `metadata` from a
  // transformer's return value — `code` and `map` are ignored, and source
  // mappings are reconstructed downstream from AST `loc` properties. True
  // original-source maps would require Metro-side wiring (intercepting
  // inputMap in the worker) that is out of scope for this incubator package.
  // The `map?` field on SourceTransformResult is retained as a forward-looking
  // placeholder so a future map-aware path does not require a type change.
  return args;
}

/**
 * Test-only probe. Holds the resolved `TransformerContext` from the most
 * recent `transform()` call so unit tests can introspect derived flags such
 * as `nativeTransform` (e.g. to verify the `codegenNativeComponent` regex
 * bypass behaves correctly).
 *
 * This is NOT part of the public API. The name carries the `__testOnly`
 * prefix so it's obvious at call sites that it exists for tests only.
 */
let __lastContext: TransformerContext | undefined;

/**
 * Test-only accessor for the most recently observed transformer context.
 * @internal
 */
export function __testOnlyGetLastContext(): TransformerContext | undefined {
  return __lastContext;
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
  const args = getTransformerArgs(baseArgs as MetroBabelTransformerArgs);
  if (!args) {
    throw new Error(
      `Failed to load babel config for file ${baseArgs.filename}`
    );
  }
  __lastContext = args.context;
  const trace = getTrace("transform");
  return trace("transform core", transformWorker, args);
}

function transformWorker(
  args: TransformerArgs
): BabelFileResult | Promise<BabelFileResult> {
  const context = args.context;
  const trace = getTrace("transform");
  const upstreamOp = "transform babel upstream";

  // get the appropriate transformers for this file
  const upstreamTransform = getUpstreamTransformer(context, args.filename);
  const sourceTransform = getSourceTransformer(context);

  // if there is a source transformer, either typescript or svg, run it first and pass the results to the final transformer
  // a null result means the source transformer couldn't handle the file (e.g. Flow syntax) — fall through to Babel
  if (sourceTransform) {
    const srcResult = sourceTransform(args);
    if (isPromiseLike(srcResult)) {
      return srcResult.then((result) => {
        if (result) applySourceResult(result, args);
        return trace(upstreamOp, upstreamTransform, args);
      });
    } else if (srcResult) {
      applySourceResult(srcResult, args);
    }
  }

  // return the final transform, which may be a promise but transform handles both cases internally
  return trace(upstreamOp, upstreamTransform, args);
}
