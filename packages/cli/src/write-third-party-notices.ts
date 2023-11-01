import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { writeThirdPartyNotices } from "@rnx-kit/third-party-notices";
import { parseBoolean } from "./parsers";

type CliThirdPartyNoticesOptions = {
  rootPath: string;
  sourceMapFile: string;
  json: boolean;
  outputFile?: string;
  ignoreScopes?: string;
  ignoreModules?: string;
  preambleText?: string;
  additionalText?: string;
};

export function rnxWriteThirdPartyNotices(
  _argv: string[],
  _config: CLIConfig,
  {
    additionalText,
    ignoreModules,
    ignoreScopes,
    json,
    outputFile,
    preambleText,
    rootPath,
    sourceMapFile,
  }: CliThirdPartyNoticesOptions
): void {
  // react-native-cli is not as rich as yargs, so we have to perform a mapping.
  writeThirdPartyNotices({
    rootPath,
    sourceMapFile,
    json,
    outputFile,
    ignoreScopes: ignoreScopes?.split(","),
    ignoreModules: ignoreModules?.split(","),
    preambleText: preambleText ? [preambleText] : undefined,
    additionalText: additionalText ? [additionalText] : undefined,
  });
}

export const rnxWriteThirdPartyNoticesCommand = {
  name: "rnx-write-third-party-notices",
  description: "Writes third party notices based on the given bundle",
  func: rnxWriteThirdPartyNotices,
  options: [
    {
      name: "--root-path <path>",
      description:
        "The root of the repo. This is the starting point for finding each module in the source map dependency graph.",
    },
    {
      name: "--source-map-file <file>",
      description:
        "The source map file associated with the package's entry file. This source map eventually leads to all package dependencies and their licenses.",
    },
    {
      name: "--json",
      description: "Format the 3rd-party notice file as JSON instead of text.",
      default: false,
      parse: parseBoolean,
    },
    {
      name: "--output-file [file]",
      description: "The path to use when writing the 3rd-party notice file.",
    },
    {
      name: "--ignore-scopes [string]",
      description:
        "Comma-separated list of `npm` scopes to ignore when traversing the source map dependency graph.",
    },
    {
      name: "--ignore-modules [string]",
      description:
        "Comma-separated list of modules to ignore when traversing the source map dependency graph.",
    },
    {
      name: "--preamble-text [string]",
      description: "A string to prepend to the start of the 3rd-party notice.",
    },
    {
      name: "--additional-text [path]",
      description: "A string to append to the end of the 3rd-party notice.",
    },
  ],
};
