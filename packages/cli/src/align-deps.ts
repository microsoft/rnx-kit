import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { cli, cliOptions } from "@rnx-kit/align-deps";
import { pickValues } from "@rnx-kit/tools-language/properties";

type CLIArgs = Record<string, string | number | boolean | undefined>;

const optionsMap: Partial<Record<keyof typeof cliOptions, string>> = {
  "exclude-packages": "excludePackages",
  init: "init",
  presets: "presets",
  requirements: "requirements",
  "set-version": "setVersion",
};

export function rnxAlignDeps(
  argv: string[],
  _config: CLIConfig,
  args: CLIArgs
): void {
  cli({
    ...pickValues(args, Object.values(optionsMap), Object.keys(optionsMap)),
    loose: Boolean(args.loose),
    "migrate-config": Boolean(args.migrateConfig),
    verbose: Boolean(args.verbose),
    write: Boolean(args.write),
    packages: argv,
  });
}

export const rnxAlignDepsCommand = {
  name: "rnx-align-deps",
  description:
    "Manage dependencies within a repository and across many repositories",
  func: rnxAlignDeps,
  options: [
    {
      name: "--exclude-packages [packages]",
      description: cliOptions["exclude-packages"].description,
    },
    {
      name: `--init [${cliOptions.init.choices?.join("|")}]`,
      description: cliOptions.init.description,
    },
    {
      name: "--loose",
      description: cliOptions.loose.description,
    },
    {
      name: "--migrate-config",
      description: cliOptions["migrate-config"].description,
    },
    {
      name: "--presets [presets]",
      description: cliOptions.presets.description,
    },
    {
      name: "--requirements [requirements]",
      description: cliOptions.requirements.description,
    },
    {
      name: "--set-version [versions]",
      description: cliOptions["set-version"].description,
    },
    {
      name: "--verbose",
      description: cliOptions.verbose.description,
    },
    {
      name: "--write",
      description: cliOptions.write.description,
    },
  ],
};
