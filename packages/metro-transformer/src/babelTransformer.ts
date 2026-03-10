import type { BabelFileResult } from "@babel/core";
import type { CustomTransformerOptions } from "@rnx-kit/types-metro-config";
import micromatch from "micromatch";
import crypto from "node:crypto";
import fs from "node:fs";
import Module from "node:module";

type TransformerModule = {
  transform: (
    args: BabelTransformerArgs,
  ) => BabelFileResult | Promise<BabelFileResult>;
  getCacheKey?: () => string;
};

import type { BabelTransformerArgs as BaseTransformerArgs } from "metro-babel-transformer";

/**
 * Types for babel transformers that can be set as the babelTransformerPath in the Metro transformer config.
 */

/**
 * Options passed in to the transform function of a babel transformer.
 */
export type WithCustomOptions<T extends object = object> = Omit<
  T,
  "customTransformOptions"
> & {
  customTransformOptions: CustomTransformerOptions;
};

/**
 * Arguments passed in to the transform function of a babel transformer.
 */
export type BabelTransformerArgs = Omit<BaseTransformerArgs, "options"> & {
  options: WithCustomOptions<BaseTransformerArgs["options"]>;
};

// start with a hash of this file's contents as the cache key
const cacheKeyParts: (string | Buffer)[] = [fs.readFileSync(__filename)];

/**
 * Get the cached cache key. Will be recalculated if additional parts are added to cacheKeyParts
 */
export const getCacheKey = (() => {
  let cacheKey: string | undefined;
  let processedParts = -1;
  return () => {
    if (!cacheKey || processedParts !== cacheKeyParts.length) {
      const hash = crypto.createHash("md5");
      for (const part of cacheKeyParts) {
        hash.update(part);
      }
      cacheKey = hash.digest("hex");
      processedParts = cacheKeyParts.length;
    }
    return cacheKey;
  };
})();

/**
 * Patches Module._resolveFilename so that any require() call for a path in `aliases` is transparently
 * redirected to `resolvedTargetPath`. This is how we make delegate transformers (e.g. react-native-svg-transformer)
 * route their own upstream require to the path the user specified rather than the
 * default @react-native/metro-babel-transformer.
 *
 * The patch is applied once per worker process; subsequent calls are no-ops.
 */
const installAliases = (() => {
  let aliasesInstalled = false;
  return (aliases: string[], resolvedTargetPath: string): void => {
    if (!aliasesInstalled) {
      aliasesInstalled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = Module as any;
      const original: (...args: unknown[]) => string = mod._resolveFilename;
      mod._resolveFilename = function (
        request: string,
        ...rest: unknown[]
      ): string {
        if (aliases.includes(request)) {
          return resolvedTargetPath;
        }
        return original.call(mod, request, ...rest);
      };
    }
  };
})();

function findTransformerForFile(
  filename: string,
  babelTransformers: Record<string, string>,
): string | undefined {
  for (const [pattern, transformerPath] of Object.entries(babelTransformers)) {
    if (micromatch.isMatch(filename, pattern)) {
      return transformerPath;
    }
  }
  return undefined;
}

export function transform(
  args: BabelTransformerArgs,
): BabelFileResult | Promise<BabelFileResult> {
  const { customTransformerOptions } = args.options
    .customTransformOptions as unknown as {
    customTransformerOptions: CustomTransformerOptions;
  };

  const {
    upstreamTransformerPath,
    upstreamTransformerAliases,
    babelTransformers,
  } = customTransformerOptions;

  if (upstreamTransformerAliases?.length) {
    const resolvedUpstream = require.resolve(upstreamTransformerPath);
    installAliases(upstreamTransformerAliases, resolvedUpstream);
  }

  let transformerPath = upstreamTransformerPath;
  if (babelTransformers) {
    const matched = findTransformerForFile(args.filename, babelTransformers);
    if (matched) {
      transformerPath = matched;
    }
  }

  const transformer = require(transformerPath) as TransformerModule;
  return transformer.transform(args);
}
