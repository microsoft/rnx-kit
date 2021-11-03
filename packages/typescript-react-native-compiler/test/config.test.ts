import fs from "fs";
import path from "path";
import tempDir from "temp-dir";
import ts from "typescript";

import { parseCommandLine } from "../src/command-line";
import {
  ensureConfigFileOrSourceFiles,
  resolveConfigFile,
  tryReadTsConfigFile,
} from "../src/config";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
const validTsConfigPath = path.join(fixturePath, "valid-tsconfig.json");

describe("Config > resolveConfigFile", () => {
  test("returns a path to the given config file", () => {
    expect(resolveConfigFile(validTsConfigPath)).toEqual(
      path.normalize(validTsConfigPath)
    );
  });

  test("throws when the config file does not exist", () => {
    const configFile = path.join(fixturePath, "not-a-file");
    expect(() => resolveConfigFile(configFile)).toThrowError();
  });

  test("returns a path to tsconfig.json in the given directory", () => {
    const configDir = path.join(fixturePath, "config-path");
    expect(resolveConfigFile(configDir)).toEqual(
      path.normalize(path.join(configDir, "tsconfig.json"))
    );
  });

  test("throws when the tsconfig.json is not found in the given directory", () => {
    const configDir = path.join(fixturePath, "rn");
    expect(() => resolveConfigFile(configDir)).toThrowError();
  });
});

describe("Config > ensureConfigFileOrSourceFiles", () => {
  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(
        tempDir,
        "rnx-kit-typescript-react-native-compiler-config-test-"
      )
    );
  });

  afterEach(() => {
    fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  test("returns a config file when the 'project' option is set", () => {
    const cmdLine = ts.parseCommandLine(["--project", validTsConfigPath]);
    expect(ensureConfigFileOrSourceFiles(cmdLine)).toEqual(
      path.normalize(validTsConfigPath)
    );
  });

  test("throws when both a config file and individual files are on the command-line", () => {
    const cmdLine = ts.parseCommandLine([
      "--project",
      validTsConfigPath,
      "a.ts",
    ]);
    expect(() => ensureConfigFileOrSourceFiles(cmdLine)).toThrowError();
  });

  test("searches for tsconfig.json when no project or source files are on the command-line", () => {
    const cwd = process.cwd();
    try {
      const configDir = path.join(fixturePath, "config-path");
      process.chdir(configDir);
      const cmdLine = ts.parseCommandLine(["--declaration"]);
      expect(ensureConfigFileOrSourceFiles(cmdLine)).toEndWith("tsconfig.json");
    } finally {
      process.chdir(cwd);
    }
  });

  test("throws when no project or source files are on the command-line and when tsconfig.json cannot be found", () => {
    const cwd = process.cwd();
    try {
      process.chdir(testTempDir);
      const cmdLine = ts.parseCommandLine(["--declaration"]);
      expect(() => ensureConfigFileOrSourceFiles(cmdLine)).toThrowError();
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("Config > tryReadTsConfigFile", () => {
  test("returns undefined if the command-line does not specify a config file", () => {
    const cmdLine = parseCommandLine(["node", "rn-tsc.js", "a.ts"]);
    expect(tryReadTsConfigFile(cmdLine)).toBeUndefined();
  });

  test("returns the contents of the config file specified on the command-line", () => {
    const cmdLine = parseCommandLine([
      "node",
      "rn-tsc.js",
      "--project",
      validTsConfigPath,
    ]);
    const config = tryReadTsConfigFile(cmdLine);
    expect(config).toBeObject();
    expect(config.options.target).toEqual(ts.ScriptTarget.ES2015);
    expect(config.options.module).toEqual(ts.ModuleKind.CommonJS);
    expect(config.options.moduleResolution).toEqual(
      ts.ModuleResolutionKind.NodeJs
    );
    expect(config.options.declaration).toBeTrue();
  });

  test("return with errors when the config file is invalid", () => {
    const cmdLine = parseCommandLine([
      "node",
      "rn-tsc.js",
      "--project",
      path.join(fixturePath, "invalid-tsconfig.json"),
    ]);
    const config = tryReadTsConfigFile(cmdLine);
    expect(config.errors).toBeArray();
    expect(config.errors.length).toBeGreaterThan(0);
  });
});
