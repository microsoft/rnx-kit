import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { run as runJest } from "jest-cli";
import path from "path";
import { parsePlatform } from "./parsers";

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

export function rnxTest(
  _argv: string[],
  _config: CLIConfig,
  { platform }: Args
): void {
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
  const jestPath = require.resolve("jest-cli/package.json");
  const { options } = require(`${path.dirname(jestPath)}/build/cli/args`);

  return Object.keys(options).map((option) => {
    const { default: defaultValue, description, type } = options[option];
    return {
      name: `--${option} [${type}]`,
      description,
      default: defaultValue,
    };
  });
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
