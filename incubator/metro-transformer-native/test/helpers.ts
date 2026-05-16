import type { Node } from "@babel/core";
import {
  makeTransformerArgs,
  type BabelTransformerArgs,
  type BabelTransformerOptions,
  type TransformerArgs,
} from "@rnx-kit/tools-babel";
import { transformSync } from "@swc/core";
import fs from "node:fs";
import { createRequire, type Module } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, "..", "src") + path.sep;
const defaultTypeScriptLoader = require.extensions[".ts"];
let installedTypeScriptLoader = false;

export const fixturesDir = path.join(__dirname, "__fixtures__");

export function deleteSourceModule(specifier: string) {
  delete require.cache[resolveSourceModule(specifier)];
}

export function requireSourceModule<T>(specifier: string): T {
  return require(resolveSourceModule(specifier)) as T;
}

export function resolveSourceModule(specifier: string): string {
  installTypeScriptLoader();
  return require.resolve(specifier);
}

function installTypeScriptLoader() {
  if (installedTypeScriptLoader) {
    return;
  }

  require.extensions[".ts"] = (
    module: Module & { _compile(code: string, filename: string): void },
    filename: string
  ) => {
    if (!path.resolve(filename).startsWith(sourceDir)) {
      defaultTypeScriptLoader?.(module, filename);
      return;
    }

    const source = fs.readFileSync(filename, "utf8");
    const { code } = transformSync(source, {
      filename,
      jsc: {
        parser: { syntax: "typescript", tsx: filename.endsWith(".tsx") },
        target: "es2022",
      },
      module: { type: "commonjs" },
      sourceMaps: "inline",
    });
    module._compile(code, filename);
  };
  installedTypeScriptLoader = true;
}

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
