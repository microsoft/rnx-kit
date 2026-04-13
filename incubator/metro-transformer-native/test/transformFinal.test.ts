import type { BabelFileResult, Node } from "@babel/core";
import { hermesParseToAst } from "@rnx-kit/tools-babel";
import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { handleResult } from "../src/finalTransformer";
import { createTransformerArgs, type ASTNode } from "./helpers";

describe("handleResult", () => {
  it("returns { ast: null } for null result", () => {
    deepEqual(handleResult(null), { ast: null });
  });

  it("returns { ast: null } for undefined result", () => {
    deepEqual(handleResult(undefined), { ast: null });
  });

  it("throws when result has no ast", () => {
    throws(() => handleResult({ ast: undefined, code: "x", map: null }), {
      message: "Babel transformation failed to produce an AST",
    });
  });

  it("returns ast and metadata from a valid result", () => {
    const ast = { type: "File" };
    const metadata = { someMeta: true };
    const result = handleResult({ ast, metadata } as BabelFileResult);
    equal(result.ast, ast);
    deepEqual(result.metadata, metadata);
  });

  it("returns ast without metadata when metadata is absent", () => {
    const ast = { type: "File" };
    const result = handleResult({ ast } as BabelFileResult);
    equal(result.ast, ast);
    equal(result.metadata, undefined);
  });
});

describe("hermesParseToAst", () => {
  it("parses simple JavaScript to an AST", () => {
    const args = createTransformerArgs("simple.js");
    ok(args != null, "Failed to create transformer args");
    const ast = hermesParseToAst(args!);
    ok(ast != null);
    equal((ast as ASTNode).type, "File");
  });

  it("parses JSX to an AST", () => {
    const args = createTransformerArgs("component.jsx");
    ok(args != null, "Failed to create transformer args");
    const ast = hermesParseToAst(args!);
    ok(ast != null);
    equal((ast as ASTNode).type, "File");
  });

  it("produces a program body with statements", () => {
    const args = createTransformerArgs("simple.js");
    ok(args != null, "Failed to create transformer args");
    const ast = hermesParseToAst(args!);
    ok(ast != null);
    ok(
      (ast as ASTNode).program!.body!.length >= 2,
      "Expected at least 2 statements"
    );
  });
});
