import type { BabelFileResult, Node } from "@babel/core";
import {
  transformFromAstSync,
  transformFromAstAsync,
  parseSync,
} from "@babel/core";
import { getBabelConfig } from "./babelConfig";
import type { TransformerArgs } from "./types";

/**
 * Types for hermes parser, defined here as they are in flow types in the hermes-parser package
 */
export type HermesParserOptions = {
  allowReturnOutsideFunction?: boolean;
  babel?: boolean;
  flow?: "all" | "detect";
  enableExperimentalComponentSyntax?: boolean;
  enableExperimentalFlowMatchSyntax?: boolean;
  enableExperimentalFlowRecordSyntax?: boolean;
  reactRuntimeTarget?: "18" | "19";
  sourceFilename?: string;
  sourceType?: "module" | "script" | "unambiguous";
  tokens?: boolean;
  transformOptions?: {
    TransformEnumSyntax?: {
      enable: boolean;
      getRuntime?: () => unknown;
    };
  };
};

/**
 * Parse a file to an AST using the hermes parser. Matches the signature from the hermes-parser package
 * @param src incoming source file to parse
 * @param options hermes parser options
 */
export function hermesParse(src: string, options?: HermesParserOptions): Node {
  return require("hermes-parser").parse(src, options);
}

/**
 * @internal
 */
export function handleResult(
  result: BabelFileResult | null | undefined
): BabelFileResult {
  // no result means the file was ignored, we return null for the ast to signal this to the caller
  if (!result) {
    return { ast: null };
  }
  if (!result.ast) {
    throw new Error("Babel transformation failed to produce an AST");
  }
  return { ast: result.ast, metadata: result.metadata };
}

/**
 * Transforms the given source code using Babel and Hermes parser. This replaces the functionality in
 * @react-native/metro-babel-transformer with the assumption that we will always use hermes-parser and that
 * typescript will be handled by esbuild.
 *
 * @param pluginOptions options for this plugin
 * @param args babel transformer arguments, this includes the source code, filename, and babel options
 * @returns An object containing the transformed AST and metadata
 */
export function transformFinal(args: TransformerArgs) {
  const { src, pluginOptions } = args;
  const { srcType, mode } = pluginOptions;
  const babelConfig = getBabelConfig(args);
  const isTs = srcType === "ts" || srcType === "tsx";
  const slowParse = isTs && mode.ts === "babel";

  // parse the ast using hermes unless we are told to be in slow mode
  const ast = slowParse
    ? parseSync(src, babelConfig)
    : hermesParse(src, {
        babel: true,
        reactRuntimeTarget: "19",
        sourceType: babelConfig.sourceType ?? undefined,
      });

  // if the ast fails to parse return null to signal the file should be skipped
  if (!ast) {
    return handleResult(null);
  }

  // if we are in async mode, use the async transform, otherwise use the sync transform and return the results
  const { asyncTransform } = pluginOptions;
  if (asyncTransform) {
    return transformFromAstAsync(ast, src, babelConfig).then((result) =>
      handleResult(result)
    );
  }
  return handleResult(transformFromAstSync(ast, src, babelConfig));
}
