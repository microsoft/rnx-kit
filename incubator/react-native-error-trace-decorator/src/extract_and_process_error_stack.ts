import * as fse from "fs-extra";
import type { IBundleInterface, IConfigFile } from "./types";
import { isConfigFileValid, symbolicateBuffer } from "./utils";

/**
 *  Extracts and symbolicates error stack traces.
 *
 * @param errorFilePath   The path to the error file
 * @param configFilePath  The path to the config file
 */
export const extractAndSymbolicateErrorStack = (
  errorFilePath: string,
  configFilePath: string
) => {
  // Read config file as an object
  const configFile = JSON.parse(
    fse.readFileSync(configFilePath, "utf-8")
  ) as IConfigFile;

  // Check validity of the passed config file and proceed
  if (isConfigFileValid(configFile)) {
    // Read error file and split by newline
    const errorFile = fse.readFileSync(errorFilePath, "utf8").split("\n");

    /**
     * Keeps a running buffer of stack trace lines based on bundleIdentifiers and batches symbolication
     * In our experience, this works much faster than symbolicating line by line
     *
     * 1. Prints lines as is when there are no matches.
     * 2. Keeps a running buffer of lines with same identifiers.
     * 3. Whenever there is a identifier mismatch, flushes buffer and creates a new buffer
     */
    let buffer: string[] = [];
    let bufferConfig: IBundleInterface | undefined;

    errorFile.forEach((errorLine: string) => {
      const configForCurrentLine = getIdentifierForLine(
        errorLine,
        configFile.configs
      );

      // Case where no identifier matches the errorLine
      if (!configForCurrentLine) {
        // Print buffer if buffer exists
        if (buffer.length > 0 && bufferConfig) {
          symbolicateBuffer(buffer, bufferConfig.sourcemap);
          // Flush buffer
          buffer = [];
          bufferConfig = undefined;
        }
        // Print errorLine as it is
        console.log(errorLine);
        return;
      }

      // If currentLine matches ongoing buffer's bundle, add it to buffer
      if (configForCurrentLine === bufferConfig) {
        buffer.push(errorLine);
        return;
      }

      // If currentLine does not match buffer's bundle, flush buffer and create a new buffer
      if (buffer.length > 0 && bufferConfig) {
        // Print buffer
        symbolicateBuffer(buffer, bufferConfig.sourcemap);
      }
      // Create new buffer
      buffer = [errorLine];
      bufferConfig = configForCurrentLine;
    });

    // Flush buffer if there is any remaining data
    if (buffer.length > 0 && bufferConfig !== undefined) {
      symbolicateBuffer(buffer, bufferConfig.sourcemap);
    }
  }
};

const getIdentifierForLine = (
  errorLine: string,
  configs: IBundleInterface[]
) => {
  for (let configIndex = 0; configIndex < configs.length; configIndex++) {
    if (errorLine.includes(configs[configIndex].bundleIdentifier)) {
      return configs[configIndex];
    }
  }
  return;
};
