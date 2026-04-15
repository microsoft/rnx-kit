import type { Node } from "@babel/core";
import { parseSync as parseSyncBabel } from "@babel/core";
import type { TraceFunction } from "@rnx-kit/tools-performance";
import type { OxcError } from "oxc-parser";
import { toBabelAST } from "./estree";
import { getPerfTrace } from "./options";
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

export function oxcParseToAst(
  { src, filename, context, config }: TransformerArgs,
  trace?: TraceFunction
): Node | null {
  const { parseSync } = require("oxc-parser");
  const { disableOxcParser: parseDisableOxc } = context;
  trace ??= getPerfTrace();
  // setting disabled specifically turns off auto-detection, otherwise avoid flow files
  const disabled = parseDisableOxc ?? context.mayContainFlow;
  if (disabled) {
    return null;
  }
  const isTypeScript =
    context.srcSyntax === "ts" || context.srcSyntax === "tsx";

  const oxcResult = trace("parse:oxc:native", parseSync, filename, src, {
    sourceType: config.sourceType ?? "unambiguous",
    lang: context.srcSyntax,
    astType: isTypeScript ? "ts" : "js",
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
      "parse:oxc:convert-ast",
      toBabelAST,
      oxcResult.program,
      src,
      isTypeScript,
      oxcResult.comments
    );
  }
  return null;
}

export function hermesParseToAst({
  src,
  context,
  config,
}: TransformerArgs): Node | null {
  const { disableHermesParser: parseDisableHermes } = context;
  if (parseDisableHermes) {
    return null;
  }
  return hermesParse(src, {
    babel: true,
    reactRuntimeTarget: "19",
    sourceType: config.sourceType ?? undefined,
  });
}

export function parseToAst(args: TransformerArgs): Node | null {
  const trace = getPerfTrace();
  const ast =
    trace("parse:oxc", oxcParseToAst, args, trace) ??
    trace("parse:hermes", hermesParseToAst, args);
  if (ast) {
    return ast;
  }

  const { src, config } = args;

  // fall through to babel if all else fails (or if other modes are disabled)
  return trace("parse:babel", parseSyncBabel, src, config);
}
