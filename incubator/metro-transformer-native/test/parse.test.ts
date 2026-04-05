/**
 * Tests that parse each fixture with oxc (using the optimized estree conversion)
 * and hermes, comparing the resulting ASTs against Babel's parser output as reference.
 * Focused on JS/JSX since the pipeline is: swc strips TS → oxc parses JS → convert to Babel AST.
 */
import type { Node } from "@babel/core";
import { parseSync as babelParseSync } from "@babel/core";
import generate from "@babel/generator";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import { deepEqual, equal, ok } from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, describe, it } from "node:test";
import { getBabelConfig } from "../src/babelConfig";
import { hermesParseToAst, oxcParseToAst } from "../src/parse";
import { measurePassthrough } from "../src/perfTrace";
import type {
  BabelMode,
  FilePluginOptions,
  TransformerArgs,
} from "../src/types";
import { setTransformerPluginOptions } from "../src/utils";

// ── Helpers ──────────────────────────────────────────────────────────

const fixturesDir = path.join(__dirname, "__fixtures__");

const defaultMode: BabelMode = {
  jsx: "babel",
  ts: "babel",
  engine: "esbuild",
};

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

function srcTypeFromName(name: string): FilePluginOptions["srcType"] {
  const ext = path.extname(name).toLowerCase();
  if (ext === ".ts") return "ts";
  if (ext === ".tsx") return "tsx";
  if (ext === ".jsx") return "jsx";
  if (ext === ".js") return "js";
  return undefined;
}

function makeArgs(
  name: string,
  src: string,
  parserOverride?: FilePluginOptions["parser"]
): TransformerArgs {
  const ext = path.extname(name).toLowerCase();
  return {
    src,
    filename: path.join(fixturesDir, name),
    plugins: [],
    options: {
      dev: true,
      hot: false,
      minify: false,
      platform: "ios",
      type: "module",
      projectRoot: process.cwd(),
      enableBabelRCLookup: true,
      enableBabelRuntime: false,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
    } as BabelTransformerArgs["options"],
    pluginOptions: {
      ext,
      srcType: srcTypeFromName(name),
      mode: defaultMode,
      trace: measurePassthrough,
      parser: parserOverride,
    } as FilePluginOptions,
  };
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

/**
 * Strip comment lines for comparison — hermes drops leading comments,
 * and oxc may order them differently.
 */
function stripComments(code: string): string {
  return code
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .trim();
}

function babelParse(name: string, src: string): Node | null {
  const args = makeArgs(name, src, "babel");
  const babelConfig = getBabelConfig(args);
  return babelParseSync(src, babelConfig);
}

// ── Fixtures ─────────────────────────────────────────────────────────

// JS/JSX fixtures covering the key ESTree→Babel conversion patterns
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
  before(() => {
    setTransformerPluginOptions({});
  });

  for (const { name, description } of jsFixtures) {
    describe(`${name} (${description})`, () => {
      let src: string;
      let babelAst: Node;
      let oxcAst: Node | null;

      before(() => {
        src = readFixture(name);
        babelAst = babelParse(name, src)!;
        ok(babelAst != null, "Babel parse failed");

        const args = makeArgs(name, src, "oxc");
        oxcAst = oxcParseToAst(args);
      });

      it("produces a non-null AST", () => {
        ok(oxcAst != null, `oxc parse returned null for ${name}`);
      });

      it("has the same number of top-level statements", () => {
        if (!oxcAst) return;
        const oxcBody = getBody(oxcAst);
        const babelBody = getBody(babelAst);
        equal(
          oxcBody.length,
          babelBody.length,
          `Statement count: oxc=${oxcBody.length}, babel=${babelBody.length}`
        );
      });

      it("has matching statement types", () => {
        if (!oxcAst) return;
        const oxcTypes = getStatementTypes(getBody(oxcAst));
        const babelTypes = getStatementTypes(getBody(babelAst));
        deepEqual(oxcTypes, babelTypes);
      });

      it("generates equivalent code (ignoring comments)", () => {
        if (!oxcAst) return;
        const oxcCode = stripComments(toCode(oxcAst));
        const babelCode = stripComments(toCode(babelAst));
        equal(oxcCode, babelCode);
      });
    });
  }
});

// ── Tests: hermes vs babel ───────────────────────────────────────────

describe("parse: hermes vs babel (JS/JSX)", () => {
  before(() => {
    setTransformerPluginOptions({});
  });

  for (const { name, description } of jsFixtures) {
    describe(`${name} (${description})`, () => {
      let src: string;
      let babelAst: Node;
      let hermesAst: Node;

      before(() => {
        src = readFixture(name);
        babelAst = babelParse(name, src)!;
        ok(babelAst != null, "Babel parse failed");

        const args = makeArgs(name, src, "hermes");
        const babelConfig = getBabelConfig(args);
        hermesAst = hermesParseToAst(args, babelConfig);
      });

      it("produces a non-null AST", () => {
        ok(hermesAst != null);
      });

      it("has the same number of top-level statements", () => {
        const hermesBody = getBody(hermesAst);
        const babelBody = getBody(babelAst);
        equal(
          hermesBody.length,
          babelBody.length,
          `Statement count: hermes=${hermesBody.length}, babel=${babelBody.length}`
        );
      });

      it("has matching statement types", () => {
        const hermesTypes = getStatementTypes(getBody(hermesAst));
        const babelTypes = getStatementTypes(getBody(babelAst));
        deepEqual(hermesTypes, babelTypes);
      });

      it("generates equivalent code (ignoring comments)", () => {
        const hermesCode = stripComments(toCode(hermesAst));
        const babelCode = stripComments(toCode(babelAst));
        equal(hermesCode, babelCode);
      });
    });
  }
});
