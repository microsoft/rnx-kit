import type { Node } from "@babel/core";
import { parseSync as parseSyncBabel } from "@babel/core";
import type { OxcError } from "oxc-parser";
import { toBabelAST } from "./estree";
import type { HermesParserOptions, TransformerArgs } from "./types";

export function isFlowError(errors: OxcError[]): boolean {
  return errors.some((e) => e.message === "Flow is not supported");
}

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
  context,
  config,
}: TransformerArgs): Node | null {
  const { parseSync } = require("oxc-parser");
  const { trace, parseDisableOxc } = context;
  if (parseDisableOxc) {
    return null;
  }

  const oxcResult = trace("transform parse oxc", parseSync, filename, src, {
    sourceType: config.sourceType ?? "unambiguous",
    lang: context.srcSyntax,
    astType:
      context.srcSyntax === "ts" || context.srcSyntax === "tsx" ? "ts" : "js",
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

export function hermesParseToAst({
  src,
  context,
  config,
}: TransformerArgs): Node | null {
  const { trace, parseDisableHermes } = context;
  if (!parseDisableHermes) {
    return trace(`transform parse hermes`, hermesParse, src, {
      babel: true,
      reactRuntimeTarget: "19",
      sourceType: config.sourceType ?? undefined,
    });
  }
  return null;
}

export function parseToAst(args: TransformerArgs): Node | null {
  const ast = oxcParseToAst(args) ?? hermesParseToAst(args);
  if (ast) {
    return ast;
  }

  const { src, config, context } = args;
  const { trace } = context;

  // fall through to babel if all else fails (or if other modes are disabled)
  return trace("transform parse babel", parseSyncBabel, src, config);
}
