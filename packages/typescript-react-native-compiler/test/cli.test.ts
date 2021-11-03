import fs from "fs";
import path from "path";
import tempDir from "temp-dir";

import { showAllHelp, showHelp, showVersion } from "../src/commands";
import { compile } from "../src/compile";

jest.mock("../src/commands");
jest.mock("../src/compile");

import { cli } from "../src/cli";

describe("CLI > cli", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
  const validTsConfigPath = path.join(fixturePath, "valid-tsconfig.json");
  const invalidTsConfigPath = path.join(fixturePath, "invalid-tsconfig.json");

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-typescript-react-native-compiler-cli-test-")
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  test("shows the version when --version is on the command-line", () => {
    cli(["node", "rn-tsc.js", "--version"]);
    expect(showVersion).toBeCalledTimes(1);
  });

  test("shows help when --help is on the command-line", () => {
    cli(["node", "rn-tsc.js", "--help"]);
    expect(showHelp).toBeCalledTimes(1);
  });

  test("shows full help when --all is on the command-line", () => {
    cli(["node", "rn-tsc.js", "--all"]);
    expect(showAllHelp).toBeCalledTimes(1);
  });

  function testUnsupportedCmdLineParam(args: string[]): void {
    expect(() =>
      cli(["node", "rn-tsc.js", "a.ts", ...args])
    ).toThrowWithMessage(Error, /not supported/);
  }

  test("throws when unsupported option --generateCpuProfile is on the command-line", () => {
    testUnsupportedCmdLineParam(["--generateCpuProfile", "profile.log"]);
  });

  test("throws when unsupported option --build is on the command-line", () => {
    testUnsupportedCmdLineParam(["--build"]);
  });

  test("throws when unsupported option --locale is on the command-line", () => {
    testUnsupportedCmdLineParam(["--locale", "en-US"]);
  });

  test("throws when unsupported option --init is on the command-line", () => {
    testUnsupportedCmdLineParam(["--init"]);
  });

  test("throws when unsupported option --showConfig is on the command-line", () => {
    testUnsupportedCmdLineParam(["--showConfig"]);
  });

  test("throws when unsupported option --diagnostics is on the command-line", () => {
    testUnsupportedCmdLineParam(["--diagnostics"]);
  });

  test("throws when unsupported option --extendedDiagnostics is on the command-line", () => {
    testUnsupportedCmdLineParam(["--extendedDiagnostics"]);
  });

  test("throws when unsupported option --generateTrace is on the command-line", () => {
    testUnsupportedCmdLineParam(["--generateTrace", "foo"]);
  });

  test("throws when unsupported option --watch is on the command-line", () => {
    testUnsupportedCmdLineParam(["--watch"]);
  });

  test("throws when unsupported option --baseUrl is on the command-line", () => {
    testUnsupportedCmdLineParam(["--baseUrl", "foo"]);
  });

  test("fails when an invalid project config file is given", () => {
    const oldWrite = process.stdout.write;
    const mockWrite = jest.fn();
    process.stdout.write = mockWrite;

    try {
      expect(() =>
        cli(["node", "rn-tsc.js", "--project", invalidTsConfigPath])
      ).toThrowError();

      expect(mockWrite).toHaveBeenCalled();
    } finally {
      process.stdout.write = oldWrite;
    }
  });

  test("succeeds when a valid project config file is given", () => {
    cli(["node", "rn-tsc.js", "--project", validTsConfigPath]);
  });

  function testUnsupportedConfigOption(
    name: string,
    value: string | boolean | Record<string, unknown> | string[]
  ): void {
    const config = JSON.parse(fs.readFileSync(validTsConfigPath, "utf-8"));

    config.compilerOptions = config.compilerOptions || {};
    config.compilerOptions[name] = value;
    config.files = ["index.ts"];

    const configFileCopy = path.join(testTempDir, "tsconfig.json");
    fs.writeFileSync(
      configFileCopy,
      JSON.stringify(config, undefined, 2),
      "utf-8"
    );

    expect(() =>
      cli(["node", "rn-tsc.js", "--project", configFileCopy])
    ).toThrowWithMessage(Error, /not supported/);
  }

  test("throws when unsupported option --diagnostics is in the config file", () => {
    testUnsupportedConfigOption("diagnostics", true);
  });

  test("throws when unsupported option --extendedDiagnostics is in the config file", () => {
    testUnsupportedConfigOption("extendedDiagnostics", true);
  });

  test("throws when unsupported option --baseUrl is in the config file", () => {
    testUnsupportedConfigOption("baseUrl", "foo");
  });

  test("throws when unsupported option --paths is in the config file", () => {
    testUnsupportedConfigOption("paths", { abc: ["def"] });
  });

  test("throws when unsupported option --rootDirs is in the config file", () => {
    testUnsupportedConfigOption("rootDirs", ["abc", "def"]);
  });

  test("invokes compile", () => {
    cli(["node", "rn-tsc.js", "--project", validTsConfigPath]);
    expect(compile).toBeCalledTimes(1);
  });

  test("invokes compile with an incremental program", () => {
    cli(["node", "rn-tsc.js", "--project", validTsConfigPath, "--incremental"]);
    expect(compile).toBeCalledTimes(1);
    const program = (compile as jest.Mock).mock.calls[0][0];
    expect(program.emitNextAffectedFile).toBeFunction();
  });
});
