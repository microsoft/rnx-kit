/**
 * Tests that parse each fixture with oxc and hermes, comparing the resulting
 * ASTs against Babel's parser output as reference.
 */
import type { Node } from "@babel/core";
import { parseSync as babelParseSync } from "@babel/core";
import generate from "@babel/generator";
import {
  hermesParseToAst,
  makeTransformerArgs,
  oxcParseToAst,
  tracePassthrough,
} from "@rnx-kit/tools-babel";
import type {
  BabelTransformerArgs,
  TransformerArgs,
} from "@rnx-kit/tools-babel";
import { deepEqual, equal, ok } from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";

// ── Helpers ──────────────────────────────────────────────────────────

const fixturesDir = path.join(__dirname, "__fixtures__");
const settings = { trace: tracePassthrough };

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

function makeBabelArgs(name: string, src: string): BabelTransformerArgs {
  return {
    src,
    filename: path.join(fixturesDir, name),
    plugins: [],
    options: {
      dev: true,
      hot: false,
      minify: false,
      platform: "ios",
      projectRoot: process.cwd(),
      enableBabelRCLookup: true,
      enableBabelRuntime: false,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
    },
  } as BabelTransformerArgs;
}

function makeArgs(name: string, src: string): TransformerArgs | undefined {
  return makeTransformerArgs(makeBabelArgs(name, src), settings);
}

type ASTNode = Node & {
  program?: { body?: ASTNode[] };
  type: string;
};

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
  const args = makeArgs(name, src);
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
        const args = makeArgs(name, src);
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
        const args = makeArgs(name, src);
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
