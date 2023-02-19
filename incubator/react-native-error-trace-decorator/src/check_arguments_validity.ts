import type * as minimist from "minimist";
import { error, info } from "@rnx-kit/console";
import * as fse from "fs-extra";

export type IArgumentsCapability = {
  help: string;
  errorFile: string;
  configFile: string;
};

const capabilities: IArgumentsCapability = {
  help: "displays the help",
  errorFile: "pass the path to txt file containing the stack trace",
  configFile: "pass the path to the config file",
};

const JSONfileFormat = `{\n "configs": [\n{"bundleIdentifier": "Identifier for bundle 1 in the error stack", "sourcemapLocation": "Location of the sourcemap for the bundle 1"}, and so on..\n]\n}`;

const configFilePattern = `Please create a JSON config file in the following format:\n${JSONfileFormat}`;

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

  // If config file does not exist. Print out the appropriate error message
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
