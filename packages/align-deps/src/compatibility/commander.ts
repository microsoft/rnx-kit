import type { Config } from "@react-native-community/cli-types";
import { pickValues } from "@rnx-kit/tools-language/properties";
import { cli, cliOptions, description } from "../cli.ts";

type InputArgs = Record<string, string | number | boolean | undefined>;

const optionsMap: Partial<Record<keyof typeof cliOptions, string>> = {
  "exclude-packages": "excludePackages",
  "export-catalogs": "exportCatalogs",
  init: "init",
  presets: "presets",
  requirements: "requirements",
  "set-version": "setVersion",
  why: "why",
};

export const alignDepsCommand = {
  name: "rnx-align-deps",
  description,
  func: (argv: string[], _config: Config, args: InputArgs) => {
    return cli({
      ...pickValues(args, Object.values(optionsMap), Object.keys(optionsMap)),
      "check-overrides": Boolean(args.checkOverrides),
      "diff-mode": args.diffMode?.toString(),
      loose: Boolean(args.loose),
      "migrate-config": Boolean(args.migrateConfig),
      "no-unmanaged": Boolean(args.noUnmanaged),
      verbose: Boolean(args.verbose),
      write: Boolean(args.write),
      packages: argv,
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
