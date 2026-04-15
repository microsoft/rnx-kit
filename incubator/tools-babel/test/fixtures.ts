import { parseSync, transformFromAstSync } from "@babel/core";
import type { Node } from "@babel/core";
import { generate } from "@babel/generator";
import { lazyInit } from "@rnx-kit/reporter";
import {
  getFixtures as getTestFixtures,
  type FixtureSetName,
} from "@rnx-kit/test-fixtures";
import fs from "node:fs";
import path from "node:path";
import { makeTransformerArgs } from "../src/options.ts";
import { oxcParseToAst } from "../src/parse.ts";
import type {
  BabelTransformerArgs,
  BabelTransformerOptions,
  TransformerArgs,
  TransformerSettings,
} from "../src/types.ts";

export const stockSettings: TransformerSettings = {};

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

export const getFixtures = lazyInit(() => createFixtureWrapper("language"));

export const getRealWorldFixtures = lazyInit(() =>
  createFixtureWrapper("realworld")
);

export function createFixtureWrapper(name: FixtureSetName) {
  const base = getTestFixtures(name);
  const { dir, files } = base;
  const getSrc = base.getSrc.bind(base);

  const filesets: Record<string, string[]> = {};

  function getBabelArgs(
    file: string,
    overrides: Partial<BabelTransformerOptions> = {}
  ): BabelTransformerArgs {
    const filename = path.join(dir, file);
    const src = getSrc(file);
    return createBabelTransformerArgs(filename, src, overrides);
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

  function getFileData(
    file: string,
    overrides: Partial<BabelTransformerOptions> = {}
  ): FileData {
    const babelArgs = getBabelArgs(file, overrides);
    return new FileData(babelArgs);
  }

  return {
    dir,
    files,
    getFileData,
    getFiles,
    getSrc,
    getBabelArgs,
  };
}

export class FileData {
  babelArgs: BabelTransformerArgs;
  error?: Error;
  private _args?: TransformerArgs;
  private _babelAst?: Node | null;
  private _oxcAst?: Node | null;
  private _babelTransformedAst?: Node | null;
  private _oxcTransformedAst?: Node | null;
  private _srcBabel?: string | null;
  private _srcOxc?: string | null;
  private _srcTransformedBabel?: string | null;
  private _srcTransformedOxc?: string | null;

  constructor(babelArgs: BabelTransformerArgs) {
    this.babelArgs = babelArgs;
  }

  get args(): TransformerArgs {
    return (this._args ??= makeTransformerArgs(this.babelArgs, stockSettings)!);
  }

  get babelAst(): Node | null {
    if (this._babelAst === undefined) {
      const args = this.args;
      this._babelAst = args ? parseSync(args.src, args.config) : null;
    }
    return this._babelAst;
  }

  get oxcAst(): Node | null {
    if (this._oxcAst === undefined) {
      this._oxcAst = this.args ? oxcParseToAst(this.args) : null;
    }
    return this._oxcAst;
  }

  get srcBabel(): string | null {
    if (this._srcBabel === undefined) {
      this._srcBabel = this.babelAst ? generate(this.babelAst).code : null;
    }
    return this._srcBabel;
  }

  get srcOxc(): string | null {
    if (this._srcOxc === undefined) {
      this._srcOxc = this.oxcAst ? generate(this.oxcAst).code : null;
    }
    return this._srcOxc;
  }

  get babelTransformedAst(): Node | null {
    if (this._babelTransformedAst === undefined) {
      try {
        this._babelTransformedAst = this.babelAst
          ? (transformFromAstSync(
              this.babelAst,
              this.args.src,
              this.args.config
            )?.ast ?? null)
          : null;
      } catch (err) {
        this._babelTransformedAst = null;
        this.error = err as Error;
      }
    }
    return this._babelTransformedAst;
  }

  get oxcTransformedAst(): Node | null {
    if (this._oxcTransformedAst === undefined) {
      try {
        this._oxcTransformedAst = this.oxcAst
          ? (transformFromAstSync(this.oxcAst, this.args.src, this.args.config)
              ?.ast ?? null)
          : null;
      } catch (err) {
        this._oxcTransformedAst = null;
        this.error ??= err as Error;
      }
    }
    return this._oxcTransformedAst;
  }

  get srcTransformedBabel(): string | null {
    if (this._srcTransformedBabel === undefined) {
      this._srcTransformedBabel = this.babelTransformedAst
        ? generate(this.babelTransformedAst).code
        : null;
    }
    return this._srcTransformedBabel;
  }

  get srcTransformedOxc(): string | null {
    if (this._srcTransformedOxc === undefined) {
      this._srcTransformedOxc = this.oxcTransformedAst
        ? generate(this.oxcTransformedAst).code
        : null;
    }
    return this._srcTransformedOxc;
  }
}
