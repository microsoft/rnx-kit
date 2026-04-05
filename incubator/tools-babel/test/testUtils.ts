import { parseSync, transformFromAstSync } from "@babel/core";
import type { Node } from "@babel/core";
import { lazyInit } from "@rnx-kit/reporter";
import fs from "node:fs";
import path from "node:path";
import { getBabelConfig } from "../src/config.ts";
import type {
  BabelTransformerArgs,
  BabelTransformerOptions,
} from "../src/types.ts";

export function createBabelTransformerArgs(
  filename: string,
  src: string | undefined,
  overrides: Partial<BabelTransformerArgs["options"]> = {}
): BabelTransformerArgs {
  src ??= fs.readFileSync(filename, "utf8");
  return {
    filename,
    src,
    options: {
      dev: false,
      hot: false,
      minify: false,
      platform: "ios",
      enableBabelRCLookup: true,
      enableBabelRuntime: true,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
      experimentalImportSupport: false,
      projectRoot: process.cwd(),
      ...overrides,
    },
    plugins: [],
  } as BabelTransformerArgs;
}

function isTsFile(filePath: string): boolean {
  return filePath.endsWith(".ts") || filePath.endsWith(".tsx");
}

function isJsFile(filePath: string): boolean {
  return filePath.endsWith(".js") || filePath.endsWith(".jsx");
}

export const getFixtures = lazyInit(() => {
  const dirFixtures = path.resolve(__dirname, "__fixtures__");
  const dirLang = path.join(dirFixtures, "lang");
  const files = fs.readdirSync(dirLang);
  const filesets: Record<string, string[]> = {};
  const srcCache: Record<string, string> = {};

  function getSrc(file: string): string {
    return (srcCache[file] ??= fs.readFileSync(
      path.join(dirLang, file),
      "utf8"
    ));
  }

  function getFiles(
    fileset?: "js" | "js-comments" | "js-no-comments" | "ts"
  ): string[] {
    if (fileset) {
      switch (fileset) {
        case "js":
          return (filesets["js"] ??= files.filter(isJsFile));
        case "js-comments":
          return (filesets["js-comments"] ??= files.filter(
            (f) => isJsFile(f) && f.startsWith("comments-")
          ));
        case "js-no-comments":
          return (filesets["js-no-comments"] ??= files.filter(
            (f) => isJsFile(f) && !f.startsWith("comments-")
          ));
        case "ts":
          return (filesets["ts"] ??= files.filter(isTsFile));
      }
    }
    return files;
  }

  function setupParse(
    file: string,
    overrides: Partial<BabelTransformerOptions> = {}
  ) {
    const filename = path.join(dirLang, file);
    const src = getSrc(file);
    const args = createBabelTransformerArgs(filename, src, overrides);
    const settings = {};
    const config = getBabelConfig(args, settings);
    return { src, filename, config };
  }

  function getAst(
    file: string,
    overrides: Partial<BabelTransformerOptions> = {}
  ): Node | null {
    const { src, config } = setupParse(file, overrides);
    if (config) {
      const ast = parseSync(src, config);
      return ast;
    }
    console.warn(`Babel skipping file ${file} due to config issues`);
    return null;
  }

  function getTransformedAst(
    file: string,
    overrides: Partial<BabelTransformerArgs["options"]> = {}
  ): Node | null {
    const { src, config } = setupParse(file, overrides);
    if (config) {
      const ast = parseSync(src, config);
      if (ast) {
        const result = transformFromAstSync(ast, src, config);
        return result?.ast ?? null;
      }
      return ast;
    }

    console.warn(`Babel skipping file ${file} due to config issues`);
    return null;
  }

  return { dirLang, files, getAst, getFiles, getSrc, getTransformedAst };
});
