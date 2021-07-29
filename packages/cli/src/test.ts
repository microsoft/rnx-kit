import type { Config as CLIConfig } from "@react-native-community/cli-types";
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
  const platformIndex = process.argv.indexOf("--platform");
  if (platformIndex < 0) {
    throw new Error("A target platform must be specified");
  }

  const originalArgv = process.argv.slice();

  // Remove `--platform` otherwise Jest will complain about an unrecognized
  // option.
  process.argv.splice(platformIndex, 2);

  // Remove `rnx-test` otherwise Jest will think it's a regex for test files.
  process.argv.splice(process.argv.indexOf(COMMAND_NAME), 1);

  process.env["RN_TARGET_PLATFORM"] = platform;
  require("jest-cli/bin/jest");

  // Restore `argv` otherwise `@react-native-community/cli` will think we tried
  // to show help message.
  process.argv.length = 0;
  process.argv.push(...originalArgv);
}

export function jestOptions(): Options[] {
  const { options } = require("jest-cli/build/cli/args");
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
