/**
 * Both `transform` and `getCacheKey` were copied from
 * https://github.com/facebook/react-native/blob/v0.84.1/packages/react-native-babel-transformer/src/index.js
 * and modified to use `oxc-parser` where appropriate.
 */
import { transformFromAstSync } from "@babel/core";
import type { BabelTransformer } from "metro-babel-transformer";
// @ts-expect-error Node 20.12+ supports require(esm)
import { parseSync } from "oxc-parser";
import { buildBabelConfig } from "./babel.ts";
import { isFlowError, toBabelAST } from "./estree.ts";
import { findReactNativeTransformer } from "./metro.ts";

type Transform = BabelTransformer["transform"];

function isTypeScript(fn: string): boolean {
  return Boolean(fn) && (fn.endsWith(".ts") || fn.endsWith(".tsx"));
}

export const transform: Transform = (args) => {
  const { filename, options, src, plugins } = args;

  /**
   * TODO: Any performance gains are currently negated by us having to mutate
   * the AST and convert it to Babel AST (see {@link toBabelAST}). For now, only
   * use `oxc-parser` for TypeScript files.
   */
  if (!isTypeScript(filename)) {
    return findReactNativeTransformer().transform(args);
  }

  const parsed = parseSync(filename, src, { sourceType: "unambiguous" });
  const errors = parsed.errors;
  if (errors.length > 0) {
    if (isFlowError(errors)) {
      return findReactNativeTransformer().transform(args);
    }

    for (const e of errors) {
      console.error(e.codeframe);
    }

    throw new Error(`Failed to parse '${filename}' because of above errors`);
  }

  const babelConfig = {
    // ES modules require sourceType='module' but OSS may not always want that
    sourceType: "unambiguous",
    // @ts-expect-error `plugins` is not properly typed by Metro
    ...buildBabelConfig(filename, options, plugins),
    caller: {
      // Varies Babel's config cache - presets will be re-initialized
      // if they use caller information.
      name: "metro",
      bundler: "metro",
      platform: options.platform,
      unstable_transformProfile: options.unstable_transformProfile,
    },
    ast: true,

    // NOTE(EvanBacon): We split the parse/transform steps up to accommodate
    // Hermes parsing, but this defaults to cloning the AST which increases
    // the transformation time by a fair amount.
    // You get this behavior by default when using Babel's `transform` method directly.
    cloneInputAst: false,
  } as const;

  const program = toBabelAST(parsed.program, src);
  const transformed = transformFromAstSync(program, src, babelConfig);

  // The result from `transformFromAstSync` can be null (if the file is ignored)
  if (!transformed) {
    return { ast: null, metadata: null };
  }

  return {
    ast: transformed.ast,
    metadata: transformed.metadata,
  };
};

export const getCacheKey = () => findReactNativeTransformer().getCacheKey();
