import type { Config } from "@react-native-community/cli-types";
import { cliOptions } from "./cli";
import type { WriteThirdPartyNoticesOptions } from "./types";
import { writeThirdPartyNotices } from "./write-third-party-notices";

type InputArgs = WriteThirdPartyNoticesOptions & {
  ignoreScopes?: string;
  ignoreModules?: string;
  preambleText?: string;
  additionalText?: string;
};

function rnxWriteThirdPartyNotices(
  _argv: string[],
  _config: Config,
  {
    additionalText,
    fullLicenseText,
    ignoreModules,
    ignoreScopes,
    json,
    outputFile,
    preambleText,
    rootPath,
    sourceMapFile,
  }: InputArgs
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
    fullLicenseText,
  });
}

export const writeThirdPartyNoticesCommand = {
  name: "rnx-write-third-party-notices",
  description: "Writes third party notices based on the given bundle",
  func: rnxWriteThirdPartyNotices,
  get options() {
    return Object.entries(cliOptions).map(([flag, options]) => {
      return {
        name:
          "argsString" in options
            ? `--${flag} ${options.argsString}`
            : `--${flag}`,
        description: options.description,
        default: "default" in options ? options.default : undefined,
      };
    });
  },
};
