import { error } from "@rnx-kit/console";
import * as path from "path";
import * as yargs from "yargs";
import type { WriteThirdPartyNoticesOptions } from "./types";
import { writeThirdPartyNotices } from "./write-third-party-notices";

export const cliOptions = {
  "root-path": {
    type: "string",
    description: "The root of the repo to start resolving modules from",
    demandOption: true,
    default: process.cwd(),
    argsString: "<path>",
  },
  "source-map-file": {
    type: "string",
    description: "The source map file to generate license contents for",
    demandOption: true,
    argsString: "<path>",
  },
  json: {
    type: "boolean",
    description: "Output license information as a JSON",
    default: false,
  },
  "output-file": {
    type: "string",
    description: "The output file to write the license file to",
    argsString: "<path>",
  },
  "ignore-scopes": {
    string: true,
    array: true,
    description: "npm scopes to ignore and not emit license information for",
    argsString: "<string>",
  },
  "ignore-modules": {
    string: true,
    array: true,
    description: "Modules (JS packages) to not emit license information for",
    argsString: "<string>",
  },
  "preamble-text": {
    string: true,
    array: true,
    description:
      "A list of lines to prepend at the start of the generated license file",
    argsString: "<string>",
  },
  "additional-text": {
    string: true,
    array: true,
    description:
      "A list of lines to append at the end of the generated license file",
    argsString: "<string>",
  },
  "full-license-text": {
    type: "boolean",
    description: "Include full license text in the JSON output",
    default: false,
    implies: "json",
  },
} as const;

function fail(message: string): void {
  error(message);
  process.exitCode = 1;
}

function parseArgs(): WriteThirdPartyNoticesOptions {
  const {
    "root-path": rootPath,
    "source-map-file": sourceMapFile,
    json,
    "output-file": outputFile,
    "ignore-scopes": ignoreScopes,
    "ignore-modules": ignoreModules,
    "preamble-text": preambleText,
    "additional-text": additionalText,
    "full-license-text": fullLicenseText,
  } = yargs.options(cliOptions).argv;
  return {
    rootPath,
    sourceMapFile,
    json,
    outputFile:
      outputFile ||
      sourceMapFile.substring(
        0,
        sourceMapFile.length - path.extname(sourceMapFile).length
      ) + ".tpn",
    ignoreScopes,
    ignoreModules,
    preambleText,
    additionalText,
    fullLicenseText,
  };
}

if (require.main === module) {
  const writeTpnArgs = parseArgs();
  writeThirdPartyNotices(writeTpnArgs).catch(fail);
}
