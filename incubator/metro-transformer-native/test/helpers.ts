import type { Node } from "@babel/core";
import {
  makeTransformerArgs,
  type BabelTransformerArgs,
  type BabelTransformerOptions,
  type TransformerArgs,
} from "@rnx-kit/tools-babel";
import fs from "node:fs";
import path from "node:path";

export const fixturesDir = path.join(__dirname, "__fixtures__");

export function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixturesDir, name), "utf8");
}

/**
 * Create BabelTransformerArgs for a fixture file with standard defaults.
 */
export function createFixtureArgs(
  name: string,
  src?: string,
  overrides: Partial<BabelTransformerOptions> = {}
): BabelTransformerArgs {
  return {
    src: src ?? readFixture(name),
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
      ...overrides,
    },
  } as BabelTransformerArgs;
}

/**
 * Create full TransformerArgs from a fixture file, ready for parsing or transformation.
 */
export function createTransformerArgs(
  name: string,
  src?: string,
  overrides: Partial<BabelTransformerOptions> = {}
): TransformerArgs | null {
  return makeTransformerArgs(createFixtureArgs(name, src, overrides), {});
}

export type ASTNode = Node & {
  program?: { body?: ASTNode[] };
  type: string;
  loc?: { start: { line: number; column: number } } | null;
};
