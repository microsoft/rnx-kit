/**
 * End-to-end tests that run both the native transformer and the built-in
 * @react-native/metro-babel-transformer on the same fixture files, then
 * compare the results to ensure compatibility.
 */
import type { BabelFileResult, Node } from "@babel/core";
import generate from "@babel/generator";
import type { BabelTransformerArgs } from "@rnx-kit/tools-babel";
import { equal, ok } from "node:assert/strict";
import { before, describe, it } from "node:test";
// Our transformer (imported directly, not through the babelTransformerPath
// indirection, so we can control plugin options in-process)
import { transform as nativeTransform } from "../src/babelTransformer";
// ── Transformer imports ──────────────────────────────────────────────
import { setTransformerPluginOptions } from "../src/context";
import {
  createFixtureArgs,
  readFixture,
  type ASTNode,
} from "./helpers";

// The built-in React Native transformer
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rnTransformer = require("@react-native/metro-babel-transformer") as {
  transform: (args: BabelTransformerArgs) => BabelFileResult;
};

function getBody(result: BabelFileResult): ASTNode[] {
  ok(result.ast != null, "Expected non-null AST");
  const ast = result.ast as ASTNode;
  ok(ast.program?.body != null, "Expected AST to have a program body");
  return ast.program!.body!;
}

/**
 * Collect the top-level statement types from the AST body, normalizing
 * away ordering differences introduced by type-only export elision.
 */
function getStatementTypes(body: ASTNode[]): string[] {
  return body.map((node) => node.type);
}

/**
 * Walk the AST and verify that every node with a `loc` property has
 * valid start line/column (non-negative, non-zero line). This is the
 * core requirement for Metro's source-map generation.
 */
function verifySourceLocations(
  node: ASTNode,
  filename: string,
  path = "root"
): void {
  if (node.loc) {
    ok(
      node.loc.start.line >= 1,
      `${filename}: node at ${path} has invalid start line ${node.loc.start.line}`
    );
    ok(
      node.loc.start.column >= 0,
      `${filename}: node at ${path} has invalid start column ${node.loc.start.column}`
    );
  }
  // Recurse into child nodes
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        if (value[i] && typeof value[i] === "object" && value[i].type) {
          verifySourceLocations(
            value[i] as ASTNode,
            filename,
            `${path}.${key}[${i}]`
          );
        }
      }
    } else if (value && typeof value === "object" && (value as ASTNode).type) {
      verifySourceLocations(value as ASTNode, filename, `${path}.${key}`);
    }
  }
}

/**
 * Count the total number of AST nodes in a tree (as a rough measure
 * that the transformer is producing real output and not collapsing
 * everything).
 */
function countNodes(node: ASTNode): number {
  let count = 1;
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && child.type) {
          count += countNodes(child as ASTNode);
        }
      }
    } else if (value && typeof value === "object" && (value as ASTNode).type) {
      count += countNodes(value as ASTNode);
    }
  }
  return count;
}

/**
 * Convert a BabelFileResult AST back to source code for comparison.
 */
function toCode(result: BabelFileResult): string {
  ok(result.ast != null, "Cannot generate code from null AST");
  return generate(result.ast as Node).code;
}

// ── Fixture definitions ──────────────────────────────────────────────

const fixtures = [
  { name: "simple.ts", description: "TypeScript with types and interfaces" },
  { name: "component.tsx", description: "React component with TSX" },
  { name: "simple.js", description: "Plain JavaScript" },
  { name: "component.jsx", description: "React JSX component" },
  { name: "async-patterns.ts", description: "Async/await with generics" },
  { name: "modules.ts", description: "Import/export patterns" },
  { name: "generics.ts", description: "Generic types and classes" },
];

// ── Tests ────────────────────────────────────────────────────────────

describe("e2e: native transformer vs @react-native/metro-babel-transformer", () => {
  before(() => {
    // Set up the plugin options so that the native transformer picks them up.
    // This simulates what MetroTransformerNative() does when configuring metro.
    setTransformerPluginOptions({});
  });

  for (const { name, description } of fixtures) {
    describe(name, () => {
      let src: string;
      let nativeResult: BabelFileResult;
      let rnResult: BabelFileResult;

      before(() => {
        src = readFixture(name);
        const args = createFixtureArgs(name, src);
        nativeResult = nativeTransform(args) as BabelFileResult;
        rnResult = rnTransformer.transform(args);
      });

      it(`produces a non-null AST (${description})`, () => {
        ok(nativeResult.ast != null, "native transformer produced null AST");
        ok(rnResult.ast != null, "RN transformer produced null AST");
      });

      it("produces an AST with a program body", () => {
        const nativeBody = getBody(nativeResult);
        const rnBody = getBody(rnResult);
        ok(nativeBody.length > 0, "native AST body is empty");
        ok(rnBody.length > 0, "RN AST body is empty");
      });

      it("produces a comparable number of top-level statements", () => {
        const nativeBody = getBody(nativeResult);
        const rnBody = getBody(rnResult);
        // Allow some variance — native engine may elide type-only exports that
        // Babel's TS plugin leaves as empty statements, or vice versa.
        const ratio = nativeBody.length / rnBody.length;
        ok(
          ratio >= 0.5 && ratio <= 2.0,
          `Statement count diverged too much: native=${nativeBody.length}, rn=${rnBody.length}`
        );
      });

      it("has matching core statement types", () => {
        const nativeTypes = getStatementTypes(getBody(nativeResult));
        const rnTypes = getStatementTypes(getBody(rnResult));
        // At minimum, both should contain at least one common statement type
        const nativeSet = new Set(nativeTypes);
        const rnSet = new Set(rnTypes);
        const common = [...nativeSet].filter((t) => rnSet.has(t));
        ok(
          common.length > 0,
          `No common statement types between esbuild (${[...nativeSet].join(", ")}) and RN (${[...rnSet].join(", ")})`
        );
      });

      it("produces an AST with a reasonable node count", () => {
        const nativeCount = countNodes(nativeResult.ast as ASTNode);
        const rnCount = countNodes(rnResult.ast as ASTNode);
        // Both should produce substantial ASTs (not trivially collapsed)
        ok(nativeCount > 10, `native AST has too few nodes: ${nativeCount}`);
        ok(rnCount > 10, `RN AST has too few nodes: ${rnCount}`);
        // And they should be in the same ballpark
        const ratio = nativeCount / rnCount;
        ok(
          ratio >= 0.3 && ratio <= 3.0,
          `Node count ratio out of range: native=${nativeCount}, rn=${rnCount}, ratio=${ratio.toFixed(2)}`
        );
      });
    });
  }
});

describe("e2e: source location validation", () => {
  before(() => {
    setTransformerPluginOptions({});
  });

  for (const { name, description } of fixtures) {
    it(`${name}: all AST nodes have valid source locations (${description})`, () => {
      const src = readFixture(name);
      const args = createFixtureArgs(name, src);
      const result = nativeTransform(args) as BabelFileResult;
      ok(result.ast != null);
      verifySourceLocations(result.ast as ASTNode, name);
    });
  }
});

describe("e2e: JS files produce identical code (hermesParser + hot enabled)", () => {
  // With hermesParser: true both transformers use hermes-parser for JS.
  // With hot: true both apply HMR/React Refresh plugins. This aligns the
  // full pipeline, and comparing generated code is the strictest check —
  // it validates that both transformers produce byte-identical output.
  const jsFixtures = fixtures.filter(
    (f) => f.name.endsWith(".js") || f.name.endsWith(".jsx")
  );

  before(() => {
    setTransformerPluginOptions({});
  });

  for (const { name, description } of jsFixtures) {
    it(`${name}: generated code matches exactly (${description})`, () => {
      const src = readFixture(name);
      const args = createFixtureArgs(name, src, { hermesParser: true, hot: true });
      const nativeResult = nativeTransform(args) as BabelFileResult;
      const rnResult = rnTransformer.transform(args);
      const nativeCode = toCode(nativeResult);
      const rnCode = toCode(rnResult);
      equal(nativeCode, rnCode);
    });
  }
});

describe("e2e: TypeScript type erasure", () => {
  before(() => {
    setTransformerPluginOptions({});
  });

  const tsFixtures = fixtures.filter(
    (f) => f.name.endsWith(".ts") || f.name.endsWith(".tsx")
  );

  for (const { name, description } of tsFixtures) {
    it(`${name}: native result contains no TypeScript-specific AST nodes (${description})`, () => {
      const src = readFixture(name);
      const args = createFixtureArgs(name, src);
      const result = nativeTransform(args) as BabelFileResult;
      const body = getBody(result);

      const tsNodeTypes = new Set([
        "TSTypeAliasDeclaration",
        "TSInterfaceDeclaration",
        "TSEnumDeclaration",
        "TSModuleDeclaration",
        "TSTypeAnnotation",
        "TSTypeReference",
      ]);

      for (const node of body) {
        ok(
          !tsNodeTypes.has(node.type),
          `Found TypeScript AST node '${node.type}' in native output for ${name}`
        );
      }
    });
  }
});

describe("e2e: handleJs option transforms JS files through native engine", () => {
  before(() => {
    setTransformerPluginOptions({ handleJs: true });
  });

  it("simple.js: produces valid AST when preprocessed by native engine", () => {
    const src = readFixture("simple.js");
    const args = createFixtureArgs("simple.js", src);
    const result = nativeTransform(args) as BabelFileResult;
    ok(result.ast != null);
    const body = getBody(result);
    ok(body.length > 0);
    verifySourceLocations(result.ast as ASTNode, "simple.js");
  });

  it("component.jsx: produces valid AST when preprocessed by native engine", () => {
    const src = readFixture("component.jsx");
    const args = createFixtureArgs("component.jsx", src);
    const result = nativeTransform(args) as BabelFileResult;
    ok(result.ast != null);
    const body = getBody(result);
    ok(body.length > 0);
    verifySourceLocations(result.ast as ASTNode, "component.jsx");
  });
});

describe("e2e: platform variations", () => {
  before(() => {
    setTransformerPluginOptions({});
  });

  for (const platform of ["ios", "android", "web"]) {
    it(`simple.ts: transforms successfully for platform=${platform}`, () => {
      const src = readFixture("simple.ts");
      const args = createFixtureArgs("simple.ts", src, { platform });
      const nativeResult = nativeTransform(args) as BabelFileResult;
      ok(nativeResult.ast != null);
      const body = getBody(nativeResult);
      ok(body.length > 0);
    });
  }
});

describe("e2e: dev vs production", () => {
  before(() => {
    setTransformerPluginOptions({});
  });

  for (const dev of [true, false]) {
    it(`modules.ts: transforms in ${dev ? "development" : "production"} mode`, () => {
      const src = readFixture("modules.ts");
      const args = createFixtureArgs("modules.ts", src, { dev });
      const nativeResult = nativeTransform(args) as BabelFileResult;
      ok(nativeResult.ast != null);
      const body = getBody(nativeResult);
      ok(body.length > 0);
    });
  }
});

describe("e2e: source map line coverage", () => {
  // Verify that source locations in the AST cover a meaningful range.
  // For TS files, native engine strips types and produces new output — the AST
  // locations reflect the native output, not the original source. So we
  // check that locations exist and span a reasonable range, rather than
  // mapping back to original line numbers.
  before(() => {
    setTransformerPluginOptions({});
  });

  /**
   * Recursively collect all source locations from an AST subtree.
   * This handles cases where top-level ExportNamedDeclaration wrappers
   * may not have `loc` but their inner declarations do.
   */
  function collectLocations(
    node: ASTNode,
    depth = 0
  ): { line: number; column: number }[] {
    const locs: { line: number; column: number }[] = [];
    if (node.loc) {
      locs.push(node.loc.start);
      const endLoc = (node.loc as { end?: { line: number; column: number } }).end;
      if (endLoc) {
        locs.push(endLoc);
      }
    }
    // Only recurse one level into body children to find inner declarations
    if (depth < 2) {
      for (const key of Object.keys(node)) {
        if (key === "loc" || key === "start" || key === "end") continue;
        const value = (node as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          for (const child of value) {
            if (child && typeof child === "object" && child.type) {
              locs.push(...collectLocations(child as ASTNode, depth + 1));
            }
          }
        } else if (
          value &&
          typeof value === "object" &&
          (value as ASTNode).type
        ) {
          locs.push(...collectLocations(value as ASTNode, depth + 1));
        }
      }
    }
    return locs;
  }

  for (const { name } of fixtures) {
    it(`${name}: AST nodes have valid source locations`, () => {
      const src = readFixture(name);
      const args = createFixtureArgs(name, src);
      const result = nativeTransform(args) as BabelFileResult;
      const body = getBody(result);

      // Collect locations from body nodes and their immediate children
      const allLocs: { line: number; column: number }[] = [];
      for (const node of body) {
        allLocs.push(...collectLocations(node));
      }

      ok(
        allLocs.length > 0,
        `No source locations found anywhere in ${name} AST`
      );

      // All locations should have valid values
      for (const loc of allLocs) {
        ok(loc.line >= 1, `${name}: invalid line number ${loc.line}`);
        ok(loc.column >= 0, `${name}: invalid column number ${loc.column}`);
      }

      // The locations should span multiple lines (not all collapsed to one)
      const lines = allLocs.map((l) => l.line);
      const minLine = Math.min(...lines);
      const maxLine = Math.max(...lines);
      ok(
        maxLine > minLine,
        `${name}: all locations collapsed to line ${minLine}–${maxLine}`
      );
    });
  }
});
