import crypto from "node:crypto";
import fs from "node:fs";
import type { TransformerPluginOptions } from "./types";

/**
 * Files in this package to include in the hash for the cache key.
 */
const packageFiles = [
  "babelConfig",
  "babelTransformer",
  "index",
  "transformFinal",
  "transformSrcEsbuild",
  "transformSrcSvg",
  "types",
  "utils",
];

/**
 * Implementation of getCacheKey for the transformer
 * @param options The transformer options
 * @returns The cache key
 */
export function createCacheKey(options: TransformerPluginOptions): string {
  const hash = crypto.createHash("sha256");
  // encode the options into the hash, this will ensure that changes to the options will invalidate the cache
  hash.update(JSON.stringify(options));
  // read this file and other package files to get a key that will change when the files in the package change.
  hash.update(fs.readFileSync(__filename, "utf8"));
  for (const file of packageFiles) {
    hash.update(fs.readFileSync(require.resolve(`./${file}`), "utf8"));
  }
  // return the digested hash as the cache key
  return hash.digest("hex");
}
