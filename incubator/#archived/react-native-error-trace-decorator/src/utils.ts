import { error } from "@rnx-kit/console";
import * as fs from "fs";
import type { IConfigFile } from "./types";

/**
 * Takes a buffer, joins it with a newline and symbolicates it with the provided sourcemap
 *
 * @param buffer    a string array representing the buffer
 * @param sourcemap sourcemap that must be used to symbolicate the passed buffer
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function symbolicateBuffer(buffer: string[], sourcemapContext: any) {
  if (buffer.length > 0 && sourcemapContext) {
    console.log(sourcemapContext.symbolicate(buffer.join("\n")));
  }
}

/**
 * Checks whether the config file is valid
 *
 * @param configFile  the config file passed as a parsed Json
 * @returns           a boolean value indicating if the config file is valid
 */
export function isConfigFileValid(configFile: IConfigFile): boolean {
  if (configFile.configs) {
    // Check if configs is empty
    if (configFile.configs.length === 0) {
      error("Atleast one config is required");
      return false;
    }
    // Parse through all configs and check if sourcemap files exist
    for (const config of configFile.configs) {
      if (!config?.bundleIdentifier) {
        error("Bundle Identifier must be set for all configs");
        return false;
      }

      if (!config?.sourcemap || !fs.existsSync(config.sourcemap)) {
        error(
          `Sourcemap file for ${config.bundleIdentifier} does not exist at ${config.sourcemap}`
        );
        return false;
      }
    }
    return true;
  }
  return false;
}
