import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findWorkspaceRootSync } from "../index";
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
export async function getSettingsFromRepo(): Promise<Settings> {
  if (repoSettings) {
    return repoSettings;
  }

  const workspaceRoot = findWorkspaceRootSync();
  if (!workspaceRoot) {
    throw new Error("No workspace root found");
  }

  const isYarn =
    workspaceRoot && fs.existsSync(path.join(workspaceRoot, "yarn.lock"));
  if (!isYarn) {
    throw new Error("External workspaces is only supported in yarn workspaces");
  }

  const configPathEntry = getConfigurationOptions().configPath;
  const configPathFromYarn = await getYarnOption(
    configPathEntry.configKey,
    workspaceRoot
  );
  const configPath = path.resolve(
    workspaceRoot,
    configPathFromYarn ?? configPathEntry.defaultValue
  );

  return (repoSettings = {
    configPath,
    enableLogging: false,
    outputWorkspaces: "",
    finder: loadConfigFile(configPath),
  });
}
