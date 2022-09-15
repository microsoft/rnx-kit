import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { cli } from "@rnx-kit/dep-check";
import { pickValues } from "@rnx-kit/tools-language/properties";

type CLIArgs = Record<string, string | number | boolean | undefined>;

export function rnxDepCheck(
  argv: string[],
  _config: CLIConfig,
  args: CLIArgs
): void {
  cli({
    ...pickValues(
      args,
      [
        "custom-profiles",
        "exclude-packages",
        "init",
        "set-version",
        "vigilant",
      ],
      ["customProfiles", "excludePackages", "init", "setVersion", "vigilant"]
    ),
    loose: Boolean(args.loose),
    write: Boolean(args.write),
    packages: argv,
  });
}

export const rnxDepCheckCommand = {
  name: "rnx-dep-check",
  description: "Dependency checker for React Native apps",
  func: rnxDepCheck,
  options: [
    {
      name: "--custom-profiles [module]",
      description:
        "Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a module name.",
    },
    {
      name: "--exclude-packages [packages]",
      description:
        "Comma-separated list of package names to exclude from inspection.",
    },
    {
      name: "--init [app|library]",
      description: "Writes an initial kit config",
    },
    {
      name: "--loose",
      description:
        "Determines how strict the React Native version requirement should be. Useful for apps that depend on a newer React Native version than their dependencies declare support for.",
    },
    {
      name: "--set-version [versions]",
      description:
        "Sets `reactNativeVersion` and `reactNativeDevVersion` for any configured package. The value should be a comma-separated list of `react-native` versions to set. The first number specifies the development version. Example: `0.64,0.63`",
    },
    {
      name: "--vigilant [versions]",
      description:
        "Inspects packages regardless of whether they've been configured. Specify a comma-separated list of profile versions to compare against, e.g. `0.63,0.64`. The first number specifies the target version.",
    },
    {
      name: "--write",
      description: "Writes all changes to the specified `package.json`",
    },
  ],
};
