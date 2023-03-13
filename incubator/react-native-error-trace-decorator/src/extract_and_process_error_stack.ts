import * as fs from "fs";
import type { IBundleInterface, IConfigFile } from "./types";
import { isConfigFileValid, symbolicateBuffer } from "./utils";
const SourceMapConsumer = require("source-map").SourceMapConsumer;
const Symbolication = require("metro-symbolicate/src/Symbolication.js");

const options = {
  nameSource: "function_names",
  inputLineStart: 1,
  inputColumnStart: 0,
  outputLineStart: 1,
  outputColumnStart: 0,
};

/**
 *  Extracts and symbolicates error stack traces.
 *
 * @param errorFilePath   The path to the error file
 * @param configFilePath  The path to the config file
 */
export function extractAndSymbolicateErrorStack(
  errorFilePath: string,
  configFilePath: string
): void {
  // Read config file as an object
  const configFile = JSON.parse(
    fs.readFileSync(configFilePath, "utf8")
  ) as IConfigFile;

  // Check validity of the passed config file and proceed
  if (isConfigFileValid(configFile)) {
    // Read error file and split by newline
    const errorFile = fs.readFileSync(errorFilePath, "utf8").split("\n");

    /**
     * Keeps a running buffer of stack trace lines based on bundleIdentifiers and batches symbolication
     *
     * 1. Prints lines as is when there are no matches.
     * 2. Keeps a running buffer of lines with same identifiers.
     * 3. Whenever there is a identifier mismatch, flushes buffer and creates a new buffer
     */
    let buffer: string[] = [];
    let bufferConfig: IBundleInterface | undefined;

    // Map to store sourceMapContexts for each bundleIdentifier
    // We might be able to resuse sourceMapContexts for trace lines with same bundleIdentifier
    const sourceMapContextMap = new Map<string, object>();

    for (const errorLine of errorFile) {
      const configForCurrentLine = getIdentifierForLine(
        errorLine,
        configFile.configs
      );

      // Case where no identifier matches the errorLine
      if (!configForCurrentLine) {
        if (buffer.length > 0 && bufferConfig) {
          // If we have already cached sourceMapContext for this bundleIdentifier, use it
          // Otherwise create a new sourceMapContext and cache it
          if (sourceMapContextMap.get(bufferConfig.bundleIdentifier)) {
            symbolicateBuffer(
              buffer,
              sourceMapContextMap.get(bufferConfig.bundleIdentifier)
            );
          } else {
            const sourceMapContext = Symbolication.createContext(
              SourceMapConsumer,
              fs.readFileSync(bufferConfig.sourcemap, "utf-8"),
              options
            );
            sourceMapContextMap.set(
              bufferConfig.bundleIdentifier,
              sourceMapContext
            );
            symbolicateBuffer(buffer, sourceMapContext);
          }
          // Flush buffer
          buffer = [];
          bufferConfig = undefined;
        }
        // Print errorLine as it is
        console.log(errorLine);
        continue;
      }

      // If currentLine matches ongoing buffer's bundle, add it to buffer
      if (configForCurrentLine === bufferConfig) {
        buffer.push(errorLine);
        continue;
      }

      // If currentLine does not match buffer's bundle, flush buffer and create a new buffer
      if (buffer.length > 0 && bufferConfig) {
        // If we have already cached sourceMapContext for this bundleIdentifier, use it
        // Otherwise create a new sourceMapContext and cache it
        if (sourceMapContextMap.get(bufferConfig.bundleIdentifier)) {
          symbolicateBuffer(
            buffer,
            sourceMapContextMap.get(bufferConfig.bundleIdentifier)
          );
        } else {
          const sourceMapContext = Symbolication.createContext(
            SourceMapConsumer,
            fs.readFileSync(bufferConfig.sourcemap, "utf-8"),
            options
          );
          sourceMapContextMap.set(
            bufferConfig.bundleIdentifier,
            sourceMapContext
          );
          symbolicateBuffer(buffer, sourceMapContext);
        }
      }
      // Create new buffer
      buffer = [errorLine];
      bufferConfig = configForCurrentLine;
    }

    // Flush buffer if there is any remaining data
    if (buffer.length > 0 && bufferConfig !== undefined) {
      // If we have already cached sourceMapContext for this bundleIdentifier, use it
      // Otherwise create a new sourceMapContext and cache it
      if (sourceMapContextMap.get(bufferConfig.bundleIdentifier)) {
        symbolicateBuffer(
          buffer,
          sourceMapContextMap.get(bufferConfig.bundleIdentifier)
        );
      } else {
        const sourceMapContext = Symbolication.createContext(
          SourceMapConsumer,
          fs.readFileSync(bufferConfig.sourcemap, "utf-8"),
          options
        );
        sourceMapContextMap.set(
          bufferConfig.bundleIdentifier,
          sourceMapContext
        );
        symbolicateBuffer(buffer, sourceMapContext);
      }
    }
  }
}

function getIdentifierForLine(
  errorLine: string,
  configs: IBundleInterface[]
): IBundleInterface | undefined {
  return configs.find((config) => errorLine.includes(config.bundleIdentifier));
}
