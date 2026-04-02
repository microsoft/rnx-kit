import type { Node, TransformOptions } from "@babel/core";
import { parseSync as parseSyncBabel } from "@babel/core";
import type { ParseOptions } from "@swc/core";
import { parseSync as parseSwc } from "@swc/core";
// @ts-expect-error Node 20.12+ supports require(esm)
import { parseSync } from "oxc-parser";
// @ts-expect-error Node 20.12+ supports require(esm)
import swcToBabel from "swc-to-babel";
import { isFlowError, toBabelAST } from "./estree";
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

export function oxcParseToAst({
  src,
  filename,
  pluginOptions,
}: TransformerArgs): Node | null {
  const { trace, srcType, ext } = pluginOptions;

  const oxcResult = trace("transform parse oxc", parseSync, filename, src, {
    sourceType: "unambiguous",
    lang: ext === ".svg" ? "jsx" : srcType,
  });

  const errors = oxcResult.errors;
  if (errors.length > 0) {
    if (!isFlowError(errors)) {
      for (const e of errors) {
        console.error(e.codeframe);
      }
      throw new Error(`Failed to parse '${filename}' because of above errors`);
    }
  } else {
    return trace(
      "transform parse oxc convert-ast",
      toBabelAST,
      oxcResult.program,
      src,
      trace
    );
  }
  return null;
}

export function getSwcParseOptions(args: TransformerArgs): ParseOptions {
  const { pluginOptions } = args;
  const { srcType, ext } = pluginOptions;
  const isTs = srcType === "ts" || srcType === "tsx";
  const isJsx = srcType === "jsx" || srcType === "tsx" || ext === ".svg";
  const target: ParseOptions["target"] = "es2023";
  const base = {
    comments: true,
    target,
  };
  return isTs
    ? ({
        ...base,
        syntax: "typescript",
        tsx: isJsx,
      } satisfies ParseOptions)
    : ({
        ...base,
        syntax: "ecmascript",
        jsx: isJsx,
      } satisfies ParseOptions);
}

export function swcParseToAst(args: TransformerArgs): Node | null {
  const { src, pluginOptions } = args;
  const { trace } = pluginOptions;
  const result = trace(
    "transform parse swc",
    parseSwc,
    src,
    getSwcParseOptions(args)
  );
  return trace("transform parse swc convert-ast", swcToBabel, result, src);
}

export function hermesParseToAst(
  args: TransformerArgs,
  babelConfig: TransformOptions
): Node {
  const { src, pluginOptions } = args;
  const { trace } = pluginOptions;
  return trace(`transform parse hermes`, hermesParse, src, {
    babel: true,
    reactRuntimeTarget: "19",
    sourceType: babelConfig.sourceType ?? undefined,
  });
}

export function parseToAst(
  args: TransformerArgs,
  babelConfig: TransformOptions
): Node | null {
  let ast: Node | null = null;
  const { src, pluginOptions } = args;
  const { parser = "oxc", srcType, trace } = pluginOptions;

  if (parser === "oxc") {
    ast = oxcParseToAst(args);
  } else if (parser === "swc") {
    ast = swcParseToAst(args);
  }
  if (ast) {
    return ast;
  }

  // fall through to hermes next if babel isn't set as the parser
  if (parser !== "babel" && srcType !== "ts" && srcType !== "tsx") {
    return hermesParseToAst(args, babelConfig);
  }

  // fall through to babel if all else fails (or if other modes are disabled)
  return trace("transform parse babel", parseSyncBabel, src, babelConfig);
}
