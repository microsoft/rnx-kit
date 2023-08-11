import { error } from "@rnx-kit/console";
import * as fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const exampleConfigFile = {
  configs: [
    {
      bundleIdentifier: "Identifier for Bundle 1",
      sourcemap: "path/to/sourcemap/for/bundle1",
    },
    {
      bundleIdentifier: "Identifier for Bundle 2",
      sourcemap: "path/to/sourcemap/for/bundle2",
    },
  ],
};

export function checkArgumentValidity(args: string[]) {
  const sanitizedArgs = yargs(hideBin(args))
    .option("configFile", {
      type: "string",
      alias: "cf",
      description: `pass the path to the config file in the following format:\n ${JSON.stringify(
        exampleConfigFile
      )}`,
      required: true,
    })
    .option("errorFile", {
      type: "string",
      alias: "ef",
      description: "pass the path to txt file containing the stack trace",
      required: true,
    })
    .help()
    .strict().argv;

  const { configFile, errorFile } = sanitizedArgs;

  // If config file does not exist, print out the appropriate error message
  if (!fs.existsSync(configFile)) {
    error(
      `Config file does not exist in ${configFile}. Please pass a valid path`
    );
    return false;
  }

  // If error file does not exist. Print out the appropriate error message
  if (!fs.existsSync(errorFile)) {
    error(
      `Error file does not exist in ${errorFile}. Please pass a valid path`
    );
    return false;
  }
  return { configFile, errorFile };
}
