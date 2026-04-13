/**
 * Tests that parse each fixture with oxc and hermes, comparing the resulting
 * ASTs against Babel's parser output as reference.
 */
import type { Node } from "@babel/core";
import { parseSync as babelParseSync } from "@babel/core";
import generate from "@babel/generator";
import { hermesParseToAst, oxcParseToAst } from "@rnx-kit/tools-babel";
import { deepEqual, equal, ok } from "node:assert/strict";
import { before, describe, it } from "node:test";
import { createTransformerArgs, readFixture, type ASTNode } from "./helpers";

// ── Helpers ──────────────────────────────────────────────────────────

function getBody(ast: Node): ASTNode[] {
  const node = ast as ASTNode;
  ok(node.program?.body != null, "Expected AST to have a program body");
  return node.program!.body!;
}

function getStatementTypes(body: ASTNode[]): string[] {
  return body.map((n) => n.type);
}

function toCode(ast: Node): string {
  return generate(ast).code;
}

function stripComments(code: string): string {
  return code
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("//") && !trimmed.startsWith("/*");
    })
    .join("\n")
    .trim();
}

function babelParse(name: string, src: string): Node | null {
  const args = createTransformerArgs(name, src);
  if (!args) return null;
  return babelParseSync(src, args.config);
}

// ── Fixtures ─────────────────────────────────────────────────────────

const jsFixtures = [
  { name: "simple.js", description: "basic JS" },
  { name: "literals.js", description: "literal types" },
  { name: "optional-chaining.js", description: "optional chaining" },
  { name: "classes.js", description: "classes with private fields" },
  { name: "object-methods.js", description: "object method shorthand" },
  { name: "imports-exports.js", description: "import/export patterns" },
  { name: "directives.js", description: "use strict directives" },
  { name: "parens.js", description: "parenthesized expressions" },
  { name: "component.jsx", description: "JSX component" },
  { name: "jsx-complex.jsx", description: "complex JSX with fragments" },
];

// ── Tests: oxc vs babel ──────────────────────────────────────────────

describe("parse: oxc vs babel (JS/JSX)", () => {
  for (const { name, description } of jsFixtures) {
    describe(`${name} (${description})`, () => {
      let src: string;
      let babelAst: Node;
      let oxcAst: Node | null;

      before(() => {
        src = readFixture(name);
        babelAst = babelParse(name, src)!;
        ok(babelAst != null, "Babel parse failed");
        const args = createTransformerArgs(name, src);
        oxcAst = args ? oxcParseToAst(args) : null;
      });

      it("produces a non-null AST", () => {
        ok(oxcAst != null, `oxc parse returned null for ${name}`);
      });

      it("has the same number of top-level statements", () => {
        if (!oxcAst) return;
        equal(getBody(oxcAst).length, getBody(babelAst).length);
      });

      it("has matching statement types", () => {
        if (!oxcAst) return;
        deepEqual(
          getStatementTypes(getBody(oxcAst)),
          getStatementTypes(getBody(babelAst))
        );
      });

      it("generates equivalent code (ignoring comments)", () => {
        if (!oxcAst) return;
        equal(stripComments(toCode(oxcAst)), stripComments(toCode(babelAst)));
      });
    });
  }
});

// ── Tests: hermes vs babel ───────────────────────────────────────────

describe("parse: hermes vs babel (JS/JSX)", () => {
  for (const { name, description } of jsFixtures) {
    describe(`${name} (${description})`, () => {
      let src: string;
      let babelAst: Node;
      let hermesAst: Node | null;

      before(() => {
        src = readFixture(name);
        babelAst = babelParse(name, src)!;
        ok(babelAst != null, "Babel parse failed");
        const args = createTransformerArgs(name, src);
        hermesAst = args ? hermesParseToAst(args) : null;
      });

      it("produces a non-null AST", () => {
        ok(hermesAst != null);
      });

      it("has the same number of top-level statements", () => {
        if (!hermesAst) return;
        equal(getBody(hermesAst).length, getBody(babelAst).length);
      });

      it("has matching statement types", () => {
        if (!hermesAst) return;
        deepEqual(
          getStatementTypes(getBody(hermesAst)),
          getStatementTypes(getBody(babelAst))
        );
      });

      it("generates equivalent code (ignoring comments)", () => {
        if (!hermesAst) return;
        equal(
          stripComments(toCode(hermesAst)),
          stripComments(toCode(babelAst))
        );
      });
    });
  }
});
