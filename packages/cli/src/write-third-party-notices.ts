import {
  writeThirdPartyNotices,
  IWriteThirdPartyNoticesOptions,
} from "@rnx-kit/third-party-notices";

type CliThirdPartyNoticesOptions = {
  rootPath: string;
  sourceMapFile: string;
  outputFile?: string;
  ignoreScopes?: string;
  ignoreModules?: string;
  preambleText?: string;
  additionalText?: string;
};

export function rnxWriteThirdPartyNotices(
  _argv: Array<string>,
  _config: Object /*: ConfigT*/,
  options: CliThirdPartyNoticesOptions
) {
  // react-native-cli is not as rich as yargs, so we have to perform a mapping.
  let args: IWriteThirdPartyNoticesOptions = {
    rootPath: options.rootPath,
    sourceMapFile: options.sourceMapFile,
    outputFile: options.outputFile,
    ignoreScopes: options.ignoreScopes
      ? options.ignoreScopes.split(",")
      : undefined,
    ignoreModules: options.ignoreModules
      ? options.ignoreModules.split(",")
      : undefined,
    preambleText: options.preambleText ? [options.preambleText] : undefined,
    additionalText: options.additionalText
      ? [options.additionalText]
      : undefined,
  };

  writeThirdPartyNotices(args);
}
