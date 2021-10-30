import "jest-extended";
import path from "path";
import ts from "typescript";
import { findConfigFile, readConfigFile } from "../src/config";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

describe("findConfigFile", () => {
  test("returns undefined when a config file was not found", () => {
    expect(
      findConfigFile(fixturePath, "invalid-config-file-name")
    ).toBeUndefined();
  });

  test("returns the path to the found config file", () => {
    const configFileName = findConfigFile(fixturePath, "valid-tsconfig.json");
    expect(configFileName).toBeString();
    expect(configFileName).not.toBeEmpty();
  });
});

describe("readConfigFile", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("returns an error when the config file is invalid", () => {
    const configFileName = path.join(fixturePath, "invalid-tsconfig.json");
    const config = readConfigFile(configFileName);
    expect(config.errors.length).toBeGreaterThan(0);
  });

  test("returns a valid config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const config = readConfigFile(configFileName);
    expect(config.options.target).toEqual(ts.ScriptTarget.ES2015);
    expect(config.options.module).toEqual(ts.ModuleKind.CommonJS);
  });

  test("applies optionsToExtend to the config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const optionsToExtend: ts.CompilerOptions = {
      types: ["abc", "def"],
    };
    const config = readConfigFile(configFileName, optionsToExtend);
    expect(config.options.types).toEqual(optionsToExtend.types);
  });

  test("applies watchOptionsToExtend to the config", () => {
    const configFileName = path.join(fixturePath, "valid-tsconfig.json");
    const watchOptionsToExtend: ts.WatchOptions = {
      excludeFiles: ["abc", "def"],
    };
    const config = readConfigFile(
      configFileName,
      undefined,
      watchOptionsToExtend
    );
    expect(config.watchOptions.excludeFiles).toEqual(
      watchOptionsToExtend.excludeFiles
    );
  });
});
