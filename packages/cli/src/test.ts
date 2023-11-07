import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { error } from "@rnx-kit/console";
import {
  findPackageDir,
  resolveDependencyChain,
} from "@rnx-kit/tools-node/package";
import { parsePlatform } from "@rnx-kit/tools-react-native/platform";

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
const JEST_CLI = ["jest", "jest-cli"];

export function rnxTest(
  _argv: string[],
  { root }: CLIConfig,
  { platform }: Args
): void {
  const runJest: (argv: string[]) => void = (() => {
    try {
      const { run } = require(resolveDependencyChain(JEST_CLI, root));
      return run;
    } catch (e) {
      error("'rnx-test' is unavailable because 'jest' is not installed");
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

export function jestOptions(): Options[] {
  const options = (() => {
    const jestCliPath = (() => {
      try {
        return resolveDependencyChain(JEST_CLI);
      } catch (_) {
        return undefined;
      }
    })();
    if (!jestCliPath) {
      return {};
    }

    try {
      // `yargsOptions` is exported as of 29.5.0
      // https://github.com/jestjs/jest/commit/0e8ed24a527b951efe11ed49da46e0bd8c0ebef9
      const { yargsOptions } = require(jestCliPath);
      if (yargsOptions) {
        return yargsOptions;
      }
    } catch (_) {
      // ignore
    }

    // Starting with Jest 27, we are getting this error:
    //
    // Package subpath './build/cli/args' is not defined by "exports" in
    // /~/node_modules/jest-cli/package.json
    //
    // To work around this, resolve `jest-cli` first, then use the resolved
    // path to import `./build/cli/args`.
    const jestPath = findPackageDir(jestCliPath) || "jest-cli";

    try {
      // `args.js` was moved in 29.2.0
      // https://github.com/jestjs/jest/commit/2ecf723c50c5d25b2fe94e1ff8081f36aed9d67b
      const { options } = require(`${jestPath}/build/args`);
      return options;
    } catch (_) {
      // ignore
    }

    try {
      const { options } = require(`${jestPath}/build/cli/args`);
      return options;
    } catch (_) {
      // ignore
    }

    return {};
  })();
  return Object.keys(options).map((option) => {
    const { alias, default: defaultValue, description, type } = options[option];
    const name = `--${option} [${type}]`;
    return {
      name: alias ? `-${alias}, ${name}` : name,
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
