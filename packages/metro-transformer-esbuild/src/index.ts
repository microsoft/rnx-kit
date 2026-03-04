import type { EsbuildTransformerConfig } from "@rnx-kit/types-transformer-esbuild";
import type { TransformerConfigT } from "metro-config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the directory of this file in both CJS and ESM contexts.
const currentDir: string =
  typeof __dirname !== "undefined"
    ? __dirname
    : // @ts-expect-error -- import.meta.url only evaluated in ESM at runtime
      path.dirname(fileURLToPath(import.meta.url));

export type {
  EsbuildMinifierOptions,
  EsbuildTransformerConfig,
  EsbuildTransformerOptions,
} from "@rnx-kit/types-transformer-esbuild";

/**
 * Resolves a sibling module path. In CJS (production), the compiled `.js` files
 * live alongside this file. In ESM (dev/tests), the `.ts` sources are used.
 */
function resolveSibling(name: string): string {
  const jsPath = path.join(currentDir, `${name}.js`);
  try {
    require("node:fs").accessSync(jsPath);
    return jsPath;
  } catch {
    return path.join(currentDir, `${name}.ts`);
  }
}

/**
 * Creates a partial Metro transformer configuration that uses esbuild for
 * TypeScript/JSX transpilation and/or minification.
 *
 * This transformer is standalone: it bypasses `@react-native/metro-babel-transformer`
 * entirely, using esbuild for transpilation and hermes-parser for Babel-compatible
 * AST production.
 *
 * @example
 * ```js
 * // metro.config.js
 * const { makeEsbuildTransformerConfig } = require("@rnx-kit/metro-transformer-esbuild");
 *
 * module.exports = {
 *   transformer: {
 *     ...makeEsbuildTransformerConfig({
 *       esbuildTransformer: true,
 *       esbuildMinifier: true,
 *     }),
 *   },
 * };
 * ```
 */
export function makeEsbuildTransformerConfig(
  options: EsbuildTransformerConfig = {},
): Partial<TransformerConfigT> {
  const result: Record<string, unknown> = {};

  if (options.esbuildTransformer) {
    result.babelTransformerPath = resolveSibling("esbuildTransformer");

    // Pass esbuild transformer options through customTransformOptions so the
    // transformer worker can read them at transform time.
    if (typeof options.esbuildTransformer === "object") {
      result.getTransformOptions = async () => ({
        transform: {
          customTransformOptions: {
            esbuildTransformer: options.esbuildTransformer,
          },
        },
      });
    }
  }

  if (options.esbuildMinifier) {
    result.minifierPath = resolveSibling("esbuildMinifier");

    // Pass esbuild minifier options through minifierConfig if provided as an object
    if (typeof options.esbuildMinifier === "object") {
      result.minifierConfig = options.esbuildMinifier;
    }
  }

  return result as Partial<TransformerConfigT>;
}
