import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { writeThirdPartyNotices } from "@rnx-kit/third-party-notices";

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
  _argv: Array<string>,
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
