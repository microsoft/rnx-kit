import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { error } from "@rnx-kit/console";
import { findPackageDependencyDir } from "@rnx-kit/tools-node";
import { parsePlatform } from "@rnx-kit/tools-react-native/platform";
import * as path from "path";

type Args = {
  platform: "android" | "ios" | "macos" | "windows" | "win32";
};

type Options = {
  name: string;
  description?: string;
  parse?: (val: string) => unknown;
  default?:
    | string
    | boolean
    | number
    | ((config: CLIConfig) => string | boolean | number);
};

const COMMAND_NAME = "rnx-test";

function resolveJestCli(): string {
  const jestPath = path.dirname(require.resolve("jest/package.json"));
  return require.resolve("jest-cli", { paths: [jestPath] });
}

export function rnxTest(
  _argv: string[],
  _config: CLIConfig,
  { platform }: Args
): void {
  const runJest: (argv: string[]) => void = (() => {
    try {
      const { run } = require(resolveJestCli());
      return run;
    } catch (e) {
      error("'rnx-test' is unavailable because 'jest-cli' is not installed");
      throw e;
    }
  })();

  const commandIndex = process.argv.indexOf(COMMAND_NAME);
  if (commandIndex < 0) {
    throw new Error("Failed to parse command arguments");
  }

  // Copy and remove the first arguments from `node react-native rnx-test ...`
  const argv = process.argv.slice(commandIndex + 1);

  const platformIndex = argv.indexOf("--platform");
  if (platformIndex < 0) {
    throw new Error("A target platform must be specified");
  }

  // Remove `--platform` otherwise Jest will complain about an unrecognized
  // option. We can pass the rest of the arguments to Jest as they are.
  argv.splice(platformIndex, 2);

  process.env["RN_TARGET_PLATFORM"] = platform;
  runJest(argv);
}

function jestOptions(): Options[] {
  // Starting with Jest 27, we are getting this error:
  //
  // Package subpath './build/cli/args' is not defined by "exports" in
  // /~/node_modules/jest-cli/package.json
  //
  // To work around this, resolve `jest-cli` first, then use the resolved path
  // to import `./build/cli/args`.
  try {
    const jestPath = findPackageDependencyDir(resolveJestCli()) || "jest-cli";

    const { options } = require(`${jestPath}/build/cli/args`);

    return Object.keys(options).map((option) => {
      const { default: defaultValue, description, type } = options[option];
      return {
        name: `--${option} [${type}]`,
        description,
        default: defaultValue,
      };
    });
  } catch (_) {
    return [];
  }
}

export const rnxTestCommand = {
  name: COMMAND_NAME,
  description: "Test runner for React Native apps",
  func: rnxTest,
  options: [
    {
      name: "--platform [android|ios|macos|windows|win32]",
      description: "Platform to target",
      parse: parsePlatform,
    },
    ...jestOptions(),
  ],
};
