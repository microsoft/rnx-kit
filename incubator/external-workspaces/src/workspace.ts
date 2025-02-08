import { findWorkspaceRootSync } from "@rnx-kit/tools-workspaces";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadConfigFile } from "./finder";
import { Settings, getConfigurationOptions } from "./options";

export const workspaceRoot = findWorkspaceRootSync();
export const isYarn =
  workspaceRoot && fs.existsSync(path.join(workspaceRoot, "yarn.lock"));

/**
 * Get an option from the yarn config, return undefined if it doesn't exist
 * @param option key value of the option to return
 * @returns a promise that will resolve to the returned result or undefined
 */
export async function getYarnOption(
  option: string
): Promise<string | undefined> {
  return new Promise((resolve) => {
    exec(
      `yarn config get ${option}`,
      { cwd: workspaceRoot },
      (error, stdout, stderr) => {
        if (error || stderr) {
          resolve(undefined);
        } else {
          resolve(stdout.trim());
        }
      }
    );
  });
}

/**
 * @returns the settings for the current repo, loaded using the node environment rather than the yarn plugin environment
 */
export async function getSettingsFromRepo(): Promise<Settings> {
  if (!workspaceRoot) {
    throw new Error("No workspace root found");
  }

  if (!isYarn) {
    throw new Error("External workspaces is only supported in yarn workspaces");
  }

  const configPathEntry = getConfigurationOptions().configPath;
  const configPathFromYarn = await getYarnOption(configPathEntry.configKey);
  const configPath = path.resolve(
    workspaceRoot,
    configPathFromYarn ?? configPathEntry.options.default
  );

  return {
    configPath,
    enableLogging: false,
    finder: loadConfigFile(configPath),
  };
}
