import * as fs from "fs";
import * as ChildProcess from "child_process";
import { error } from "@rnx-kit/console";
import type { IConfigFile } from "./types";

/**
 * Takes a buffer, joins it with a newline and symbolicates it with the provided sourcemap
 *
 * @param buffer    a string array representing the buffer
 * @param sourcemap sourcemap that must be used to symbolicate the passed buffer
 */
export function symbolicateBuffer(buffer: string[], sourcemap: string) {
  if (buffer.length > 0) {
    // Write buffer to a temp file
    fs.writeFileSync("./temp.rnbuffertrace", buffer.join("\n"));

    // Symbolicate buffer
    ChildProcess.execSync(
      `npx metro-symbolicate ${sourcemap} < ./temp.rnbuffertrace`,
      {
        stdio: "inherit",
      }
    );
    console.log("\n");

    // Delete temp file
    fs.unlinkSync("./temp.rnbuffertrace");
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
      if (
        !config?.sourcemap ||
        !fs.existsSync(config.sourcemap) ||
        !config?.bundleIdentifier
      ) {
        error(
          `Config: { bundleIdentifier: ${config.bundleIdentifier}, sourcemap: ${config.sourcemap} } is not proper`
        );
        return false;
      }
    }
    return true;
  }
  return false;
}
