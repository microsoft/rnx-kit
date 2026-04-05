import { parseSync } from "@babel/core";
import type { Node } from "@babel/core";
import { lazyInit } from "@rnx-kit/reporter";
import fs from "node:fs";
import path from "node:path";
import { getBabelConfig } from "../src/config.ts";
import type { BabelTransformerArgs } from "../src/types.ts";

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
      dev: true,
      hot: false,
      minify: false,
      platform: "ios",
      enableBabelRCLookup: true,
      enableBabelRuntime: false,
      publicPath: "/",
      globalPrefix: "",
      unstable_transformProfile: "default",
      projectRoot: process.cwd(),
      ...overrides,
    },
    plugins: [],
  } as BabelTransformerArgs;
}

export const getFixtures = lazyInit(() => {
  const dirFixtures = path.resolve(__dirname, "__fixtures__");
  const dirLang = path.join(dirFixtures, "lang");
  const files = fs.readdirSync(dirLang);

  function getAst(file: string): Node | null {
    const filePath = path.join(dirLang, file);
    const args = createBabelTransformerArgs(filePath, undefined, {});
    const settings = {};
    const config = getBabelConfig(args, settings);
    if (config) {
      const ast = parseSync(args.src, config);
      return ast;
    } else {
      console.warn(`Babel skipping file ${file} due to config issues`);
    }
    return null;
  }

  return { dirLang, files, getAst };
});
