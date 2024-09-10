import type { Config } from "@react-native-community/cli-types";
import { pickValues } from "@rnx-kit/tools-language/properties";
import { cli, cliOptions, description } from "../cli";

type InputArgs = Record<string, string | number | boolean | undefined>;

const optionsMap: Partial<Record<keyof typeof cliOptions, string>> = {
  "exclude-packages": "excludePackages",
  init: "init",
  presets: "presets",
  requirements: "requirements",
  "set-version": "setVersion",
};

export const alignDepsCommand = {
  name: "rnx-align-deps",
  description,
  func: (_argv: string[], _config: Config, args: InputArgs) => {
    cli({
      ...pickValues(args, Object.values(optionsMap), Object.keys(optionsMap)),
      "diff-mode": args.diffMode?.toString(),
      loose: Boolean(args.loose),
      "migrate-config": Boolean(args.migrateConfig),
      "no-unmanaged": Boolean(args.noUnmanaged),
      verbose: Boolean(args.verbose),
      write: Boolean(args.write),
    });
  },
  get options() {
    return Object.entries(cliOptions).map(([flag, options]) => {
      const { description } = options;

      if ("choices" in options) {
        const choices = options.choices.join(" | ");
        return { name: `--${flag} <${choices}>`, description };
      }

      if ("argsString" in options) {
        return { name: `--${flag} ${options.argsString}`, description };
      }

      return { name: `--${flag}`, description };
    });
  },
};
