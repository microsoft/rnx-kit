import * as minimist from "minimist";
import { ConsoleLogger } from "./console_logger";
import * as fse from "fs-extra";


export type IArgumentsCapability = {
help: string,
splitMode: string,
splitBundleSourcemap: string,
errorFile: string,
commonBundleSourcemap: string,
commonBundleIdentifier: string,
sourcemap: string
}

const capabilities: IArgumentsCapability = {
  help: "displays the help",
  splitMode:
    "pass if the bundle is a split bundle. If true, commonBundleSourcemap and splitBundleSourcemap should be passed",
  sourcemap:
    "pass path to the bundle sourcemap. Only required if splitMode is false",
  splitBundleSourcemap:
    "pass the path to the combined sourcemap (js and hermes) if bundle is hermes. Otherwise pass the path to the js bundle sourcemap",
  errorFile: "pass the txt file containing the stack trace",
  commonBundleSourcemap: "pass the path to the sourcemap for common bundle",
  commonBundleIdentifier:
    "pass the identifier for the common bundle e.g. bundle ID. We will use this to differentiate between the common bundle and the split bundle in the error stack. (optional). If nothing is passed, default common bundle identifier shall be used"
};

export const checkArgumentValidity = (args: minimist.ParsedArgs): boolean => {
  if (!args || args.help) {
    printHelp();
    return false;
  }

  // Check if any unsupported argument is passed
  const keys = Object.keys(args);
  for (let i = 0; i < keys.length; i++) {
    if (!capabilities[keys[i]]) {
      ConsoleLogger.error(`Invalid argument ${keys[i]} passed`);
      printHelp();
      return false;
    }
  }

  // Check if error file is passed
  if (!args.errorFile) {
    ConsoleLogger.error(
      "A txt file containing the error stack should be passed"
    );
    printHelp();
    return false;
  }

  // If splitMode is false and sourcemap does not exist throw error
  if (!args.splitMode && !args.sourcemap) {
    ConsoleLogger.error("Sourcemap arg should be passed if splitMode is false");
    printHelp();
    return false;
  }

  // Check if sourcemap exists and return
  if (!args.splitMode && args.sourcemap) {
    if (!fse.existsSync(args.sourcemap)) {
      ConsoleLogger.error(
        "Sourcemap file does not exist. Please check the path"
      );
      return false;
    }
    return true;
  }

  if (
    args.splitMode &&
    (!args.splitBundleSourcemap || !args.commonBundleSourcemap)
  ) {
    ConsoleLogger.error(
      "In split mode splitBundleSourcemap, commonBundleSourcemap should be passed"
    );
    return false;
  }

  // Check if sourcemap file exists
  if (!fse.existsSync(args.splitBundleSourcemap)) {
    ConsoleLogger.error(
      "Sourcemap file does not exist. Please re-check the path"
    );
    return false;
  }

  // Check if common bundle sourcemap exists
  if (!fse.existsSync(args.commonBundleSourcemap)) {
    ConsoleLogger.error(
      "Common bundle sourcemap file does not exist. Please re-check the path"
    );
    return false;
  }
  return true;
};

const printHelp = () => {
  let capabString = "";
  Object.keys(capabilities).forEach(capab => {
    capabString = `${capabString}\n--${capab}:- ${capabilities[capab]}`;
  });

  ConsoleLogger.log(capabString);
};
