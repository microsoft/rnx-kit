import type * as minimist from "minimist";
import { error, info } from "@rnx-kit/console";
import * as fse from "fs-extra";
import type { IArgumentsCapability } from "./types";

const capabilities: IArgumentsCapability = {
  help: "displays the help",
  errorFile: "pass the path to txt file containing the stack trace",
  configFile: "pass the path to the config file",
};

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
const configFilePattern = `Please create a JSON config file in the following format:\n${exampleConfigFile}`;

export const checkArgumentValidity = (args: minimist.ParsedArgs): boolean => {
  // If help flag is passed, print help
  if (args.help) {
    printHelp();
    return false;
  }

  // If configFile param is not passed, deem the arguments invalid
  if (!args.configFile) {
    error(
      "configFile argument was not passed. Please pass a path to the config file."
    );
    printHelp();
    return false;
  }

  // If config file does not exist, print out the appropriate error message
  if (!fse.existsSync(args.configFile)) {
    error(
      `Config file does not exist in ${args.configFile}. Please pass a valid path`
    );
    return false;
  }

  // If errorFile param is not passed, deem the arguments invalid
  if (!args.errorFile) {
    error(
      "errorFile argument was not passed. Please pass a path to the errorFile file."
    );
    printHelp();
    return false;
  }

  // If error file does not exist. Print out the appropriate error message
  if (!fse.existsSync(args.errorFile)) {
    error(
      `Error file does not exist in ${args.errorFile}. Please pass a valid path`
    );
    return false;
  }

  return true;
};

const printHelp = () => {
  let capabString = "";
  Object.keys(capabilities).forEach((capab) => {
    capabString = `${capabString}\n--${capab}:- ${
      capabilities[capab as keyof IArgumentsCapability]
    }`;
  });
  info(capabString);
  info(configFilePattern);
};
