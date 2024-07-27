import { deepEqual, equal, ok } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import ts from "typescript";
import { findConfigFile, readConfigFile } from "../src/config";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

describe("findConfigFile()", () => {
  it("returns undefined when a config file was not found", () => {
    ok(!findConfigFile(fixturePath, "invalid-config-file-name"));
  });

  it("returns the path to the found config file", () => {
    const configFileName = findConfigFile(fixturePath, "valid-tsconfig.json");

    equal(typeof configFileName, "string");
    ok(configFileName);
  });
});

describe("readConfigFile()", () => {
  it("returns an error when the config file is invalid", () => {
    const configFileName = path.join(fixturePath, "invalid-tsconfig.json");
    const config = readConfigFile(configFileName);

    ok(config?.errors.length ?? 0 > 0);
  });

  it("returns a valid config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const config = readConfigFile(configFileName);

    equal(config?.options.target, ts.ScriptTarget.ES2015);
    equal(config?.options.module, ts.ModuleKind.CommonJS);
  });

  it("applies optionsToExtend to the config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const optionsToExtend: ts.CompilerOptions = { types: ["abc", "def"] };
    const config = readConfigFile(configFileName, optionsToExtend);

    deepEqual(config?.options.types, optionsToExtend.types);
  });

  it("applies watchOptionsToExtend to the config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const watchOptionsToExtend: ts.WatchOptions = {
      excludeFiles: ["abc", "def"],
    };
    const config = readConfigFile(
      configFileName,
      undefined,
      watchOptionsToExtend
    );

    deepEqual(
      config?.watchOptions?.excludeFiles,
      watchOptionsToExtend.excludeFiles
    );
  });
});
