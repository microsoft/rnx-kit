import * as path from "path";
import chalk from "chalk";
import * as yargs from "yargs";

import {
  writeThirdPartyNotices,
  IWriteThirdPartyNoticesOptions,
} from "./write-third-party-notices";

function fail(message: string): never {
  console.error(chalk.red(message));
  process.exit(1);
}

function getArgs(): IWriteThirdPartyNoticesOptions {
  const argv = yargs.options({
    rootPath: {
      type: "string",
      describe: "The root of the repo where to start resolving modules from.",
      require: true,
    },
    sourceMapFile: {
      type: "string",
      describe: "The sourceMap file to generate licence contents for.",
      require: true,
    },
    outputFile: {
      type: "string",
      describe: "The output file to write the licence file to.",
    },
    ignoreScopes: {
      string: true,
      array: true,
      describe: "Npm scopes to ignore and not emit licence information for",
    },
    ignoreModules: {
      string: true,
      array: true,
      describe: "Modules (js packages) to not emit licence information for ",
    },
    preambleText: {
      string: true,
      array: true,
      describe:
        "A list of lines to prepend at the start of the generated licence file.",
    },
    additionalText: {
      string: true,
      array: true,
      describe:
        "A list of lines to append at the end of the generated licence file.",
    },
  }).argv;

  const writeTpnArgs: IWriteThirdPartyNoticesOptions = argv;

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

main().catch((err: string) => {
  fail(`Error encountered: ${err}`);
});
