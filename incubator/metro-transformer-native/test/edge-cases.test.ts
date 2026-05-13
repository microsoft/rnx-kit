import type { BabelFileResult } from "@babel/core";
import { equal, ok, throws } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { transform } from "../src/babelTransformer";
import { setTransformerPluginOptions } from "../src/context";
import { createFixtureArgs, type ASTNode } from "./helpers";

describe("edge cases", () => {
  beforeEach(() => setTransformerPluginOptions({}));

  it("empty TS file produces a non-null AST with an empty body", () => {
    const result = transform(createFixtureArgs("empty.ts")) as BabelFileResult;
    ok(result.ast != null);
    const ast = result.ast as ASTNode;
    equal(ast.program!.body!.length, 0);
  });

  it("empty JS file produces a non-null AST with an empty body", () => {
    const result = transform(createFixtureArgs("empty.js")) as BabelFileResult;
    ok(result.ast != null);
    const ast = result.ast as ASTNode;
    equal(ast.program!.body!.length, 0);
  });

  it("syntax error: SWC returns null; transformFinal's parse step throws with the filename in the message", () => {
    // SWC catches the parse error and returns null → fall through to parseToAst →
    // oxc parse also throws, with the filename in the error message.
    throws(
      () => transform(createFixtureArgs("syntax-error.ts")),
      (err: Error) => /syntax-error\.ts/.test(err.message)
    );
  });
});
