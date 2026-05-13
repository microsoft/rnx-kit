#!/usr/bin/env node
/**
 * Validation script for the tightened e2e ratios in
 * `test/e2e-transform.test.ts`. The test file itself uses ESM syntax and
 * currently fails to load via `rnx-kit-scripts test` (CJS package scope —
 * a pre-existing infrastructure issue out of slice 05's scope). Until
 * that lands, this script runs the same comparison logic against the
 * fixtures so we can confidently say the tightened bounds DO pass on the
 * current implementation.
 *
 * Usage:
 *   node --experimental-strip-types --disable-warning=ExperimentalWarning bench/e2e-ratios-validate.ts
 *
 * Exit 0 if every fixture's adjusted ratio falls in the tightened bounds.
 * Exit 1 with the offending fixture(s) listed otherwise.
 */

import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..");
const FIXTURES_DIR = path.join(PACKAGE_ROOT, "test", "__fixtures__");

const fixtures = [
  "simple.ts",
  "component.tsx",
  "simple.js",
  "component.jsx",
  "async-patterns.ts",
  "modules.ts",
  "generics.ts",
];

const allowedRemovedTypes = new Set([
  "TSTypeAliasDeclaration",
  "TSInterfaceDeclaration",
  "TSEnumDeclaration",
  "TSDeclareFunction",
]);
const allowedAddedTypes = new Set(["EmptyStatement"]);

const fixtureStatementBounds: Record<string, [number, number]> = {
  "component.tsx": [0.75, 1.25],
};
const fixtureNodeBounds: Record<string, [number, number]> = {
  "component.tsx": [0.75, 1.7],
};

type ASTNode = {
  type: string;
  program?: { body?: ASTNode[] };
  [k: string]: unknown;
};

function isTypeScriptFixture(name: string): boolean {
  return name.endsWith(".ts") || name.endsWith(".tsx");
}

function countAdjustedStatements(
  body: ASTNode[],
  ignore: Set<string>
): number {
  return body.filter((n) => !ignore.has(n.type)).length;
}

function countNodes(node: ASTNode): number {
  let count = 1;
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && (child as ASTNode).type) {
          count += countNodes(child as ASTNode);
        }
      }
    } else if (value && typeof value === "object" && (value as ASTNode).type) {
      count += countNodes(value as ASTNode);
    }
  }
  return count;
}

function countAdjustedNodes(node: ASTNode, ignore: Set<string>): number {
  if (ignore.has(node.type)) return 0;
  let count = 1;
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === "object" && (child as ASTNode).type) {
          count += countAdjustedNodes(child as ASTNode, ignore);
        }
      }
    } else if (value && typeof value === "object" && (value as ASTNode).type) {
      count += countAdjustedNodes(value as ASTNode, ignore);
    }
  }
  return count;
}

function makeArgs(name: string, src: string) {
  return {
    src,
    filename: path.join(FIXTURES_DIR, name),
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
  };
}

async function main(): Promise<number> {
  // Set up native transformer.
  const ctx = require("../lib/context.js") as {
    setTransformerPluginOptions: (o: Record<string, unknown>) => void;
  };
  ctx.setTransformerPluginOptions({});
  const native = require("../lib/babelTransformer.js") as {
    // oxlint-disable-next-line typescript/no-explicit-any
    transform: (a: any) => any;
  };
  const rn = require("@react-native/metro-babel-transformer") as {
    // oxlint-disable-next-line typescript/no-explicit-any
    transform: (a: any) => any;
  };

  const failures: string[] = [];

  for (const name of fixtures) {
    const src = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
    const args = makeArgs(name, src);
    const nr = native.transform(args);
    const rr = rn.transform(args);
    const nAst = nr.ast as ASTNode;
    const rAst = rr.ast as ASTNode;
    const nBody = nAst.program?.body ?? [];
    const rBody = rAst.program?.body ?? [];

    const isTs = isTypeScriptFixture(name);
    const stmtN = isTs
      ? countAdjustedStatements(nBody, allowedAddedTypes)
      : nBody.length;
    const stmtR = isTs
      ? countAdjustedStatements(rBody, allowedRemovedTypes)
      : rBody.length;
    const stmtRatio = stmtN / stmtR;
    const [stmtLo, stmtHi] =
      fixtureStatementBounds[name] ?? (isTs ? [0.8, 1.25] : [0.5, 2.0]);
    const stmtPass = stmtRatio >= stmtLo && stmtRatio <= stmtHi;

    const nodeN = isTs
      ? countAdjustedNodes(nAst, allowedAddedTypes)
      : countNodes(nAst);
    const nodeR = isTs
      ? countAdjustedNodes(rAst, allowedRemovedTypes)
      : countNodes(rAst);
    const nodeRatio = nodeN / nodeR;
    const [nodeLo, nodeHi] =
      fixtureNodeBounds[name] ?? (isTs ? [0.6, 1.7] : [0.3, 3.0]);
    const nodePass = nodeRatio >= nodeLo && nodeRatio <= nodeHi;

    {
      // Verbose debugging block — leaving on so future calibrations can see
      // the body composition without flipping flags. Output is small.
      // oxlint-disable-next-line no-console
      console.log(`  ${name} native body types: ${nBody.map((n) => n.type).join(", ")}`);
      // oxlint-disable-next-line no-console
      console.log(`  ${name} rn body types:     ${rBody.map((n) => n.type).join(", ")}`);
    }
    // oxlint-disable-next-line no-console
    console.log(
      `${stmtPass && nodePass ? "OK  " : "FAIL"}  ${name.padEnd(20)}  stmt n=${stmtN} r=${stmtR} ratio=${stmtRatio.toFixed(2)} [${stmtLo},${stmtHi}]  node n=${nodeN} r=${nodeR} ratio=${nodeRatio.toFixed(2)} [${nodeLo},${nodeHi}]`
    );
    if (!stmtPass) failures.push(`${name} stmt ratio ${stmtRatio.toFixed(2)} not in [${stmtLo}, ${stmtHi}]`);
    if (!nodePass) failures.push(`${name} node ratio ${nodeRatio.toFixed(2)} not in [${nodeLo}, ${nodeHi}]`);
  }

  if (failures.length > 0) {
    // oxlint-disable-next-line no-console
    console.error("\nFAIL — fixtures outside tightened bounds:");
    for (const f of failures) {
      // oxlint-disable-next-line no-console
      console.error(`  - ${f}`);
    }
    return 1;
  }
  // oxlint-disable-next-line no-console
  console.error("\nOK — all fixtures within tightened bounds.");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // oxlint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
