import type { BabelFileResult, Node } from "@babel/core";
import { deepEqual, equal, ok, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { handleResult } from "../src/finalTransformer";
import { hermesParse } from "../src/parse";

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

describe("hermesParse", () => {
  it("parses simple JavaScript to an AST", () => {
    const ast = hermesParse("const x = 1;", { babel: true });
    ok(ast != null);
    equal(
      (ast as Node & { type: string; program?: { body: unknown[] } }).type,
      "File"
    );
  });

  it("parses JSX with babel mode", () => {
    const ast = hermesParse("const el = <div>hello</div>;", { babel: true });
    ok(ast != null);
    equal(
      (ast as Node & { type: string; program?: { body: unknown[] } }).type,
      "File"
    );
  });

  it("produces a program body with statements", () => {
    const ast = hermesParse("const a = 1; const b = 2;", { babel: true });
    ok(
      (ast as Node & { type: string; program?: { body: unknown[] } }).program
        .body.length === 2
    );
  });
});
