import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfigFile } from "./finder";
import { getConfigurationOptions } from "./options";
import type { Settings } from "./types";

/**
 * Get an option from the yarn config, return undefined if it doesn't exist
 * @param option key value of the option to return
 * @returns a promise that will resolve to the returned result or undefined
 */
export async function getYarnOption(
  option: string,
  cwd: string = process.cwd()
): Promise<string | undefined> {
  return new Promise((resolve) => {
    exec(`yarn config get ${option}`, { cwd }, (error, stdout, stderr) => {
      if (error || stderr) {
        resolve(undefined);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

let repoSettings: Settings | undefined = undefined;

/**
 * @returns the settings for the current repo, loaded using the node environment rather than the yarn plugin environment
 */
export async function getSettingsFromRepo(rootPath: string): Promise<Settings> {
  if (repoSettings) {
    return repoSettings;
  }

  if (!rootPath) {
    throw new Error("No workspace root specified");
  }

  const isYarn = fs.existsSync(path.join(rootPath, "yarn.lock"));
  if (!isYarn) {
    throw new Error("External workspaces is only supported in yarn workspaces");
  }

  const configPathEntry = getConfigurationOptions().configPath;
  const configPathFromYarn = await getYarnOption(
    configPathEntry.configKey,
    rootPath
  );
  const configPath = path.resolve(
    rootPath,
    configPathFromYarn ?? configPathEntry.defaultValue
  );

  return (repoSettings = {
    configPath,
    enableLogging: false,
    outputWorkspaces: "",
    finder: loadConfigFile(configPath),
  });
}
