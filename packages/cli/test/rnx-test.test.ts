import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { rnxTest } from "../src/test.ts";

const RN_TARGET_PLATFORM = "RN_TARGET_PLATFORM";

jest.mock("@rnx-kit/tools-node/package", () => {
  const actual = jest.requireActual("@rnx-kit/tools-node/package");
  return {
    ...actual,
    resolveDependencyChain: jest.fn((modules: string[], startDir?: string) => {
      // Only redirect the lookup done by `rnxTest` (which passes a start dir).
      // Leave `jestOptions()` and everything else untouched.
      return startDir
        ? require.resolve("./__fixtures__/jest-cli-stub.cjs")
        : actual.resolveDependencyChain(modules, startDir);
    }),
  };
});

describe("rnx-test", () => {
  const jest = require("./__fixtures__/jest-cli-stub.cjs");

  const savedArgv = process.argv;
  const savedExitCode = process.exitCode;

  beforeEach(() => {
    jest.calls.length = 0;
  });

  afterEach(() => {
    delete process.env[RN_TARGET_PLATFORM];
    process.argv = savedArgv;
    process.exitCode = savedExitCode;
  });

  const config = { root: "/repo" } as CLIConfig;

  it("forwards the remaining arguments to Jest and sets the target platform", () => {
    process.argv = [
      "node",
      "react-native",
      "rnx-test",
      "--platform",
      "ios",
      "--ci",
      "path/to/my.test.ts",
    ];

    rnxTest([], config, { platform: "ios" });

    expect(process.env[RN_TARGET_PLATFORM]).toBe("ios");
    expect(jest.calls).toEqual([["--ci", "path/to/my.test.ts"]]);
  });

  it("errors and sets a non-zero exit code when no platform is specified", () => {
    process.argv = ["node", "react-native", "rnx-test", "path/to/my.test.ts"];
    process.exitCode = 0;

    rnxTest([], config, { platform: undefined as never });

    expect(process.exitCode).toBe(1);
    expect(jest.calls).toEqual([]);
    expect(process.env[RN_TARGET_PLATFORM]).toBeUndefined();
  });

  it("throws when the command cannot be found in the arguments", () => {
    process.argv = ["node", "react-native", "--platform", "ios"];

    expect(() => rnxTest([], config, { platform: "ios" })).toThrow(
      "Failed to parse command arguments"
    );
    expect(jest.calls).toEqual([]);
  });
});
