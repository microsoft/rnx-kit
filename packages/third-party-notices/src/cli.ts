import { error } from "@rnx-kit/console";
import * as path from "path";
import * as yargs from "yargs";
import type { WriteThirdPartyNoticesOptions } from "./types";
import { writeThirdPartyNotices } from "./write-third-party-notices";

function fail(message: string): never {
  error(message);
  process.exit(1);
}

function getArgs(): WriteThirdPartyNoticesOptions {
  const argv = yargs.options({
    rootPath: {
      type: "string",
      describe: "The root of the repo where to start resolving modules from.",
      require: true,
    },
    sourceMapFile: {
      type: "string",
      describe: "The sourceMap file to generate license contents for.",
      require: true,
    },
    json: {
      type: "boolean",
      describe: "Output license information as a JSON",
      default: false,
    },
    outputFile: {
      type: "string",
      describe: "The output file to write the license file to.",
    },
    ignoreScopes: {
      string: true,
      array: true,
      describe: "Npm scopes to ignore and not emit license information for",
    },
    ignoreModules: {
      string: true,
      array: true,
      describe: "Modules (js packages) to not emit license information for ",
    },
    preambleText: {
      string: true,
      array: true,
      describe:
        "A list of lines to prepend at the start of the generated license file.",
    },
    additionalText: {
      string: true,
      array: true,
      describe:
        "A list of lines to append at the end of the generated license file.",
    },
  }).argv;

  const writeTpnArgs: WriteThirdPartyNoticesOptions = argv;

  if (!writeTpnArgs.outputFile) {
    writeTpnArgs.outputFile =
      writeTpnArgs.sourceMapFile?.substring(
        0,
        writeTpnArgs.sourceMapFile.length -
          path.extname(writeTpnArgs.sourceMapFile).length
      ) + ".tpn";
  }

  return writeTpnArgs;
}

async function main(): Promise<void> {
  const writeTpnArgs = getArgs();
  await writeThirdPartyNotices(writeTpnArgs);
}

main().catch((err: string) => fail(err));
