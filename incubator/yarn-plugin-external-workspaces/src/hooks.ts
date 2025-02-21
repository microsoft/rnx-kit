import { type Project } from "@yarnpkg/core";
import { getSettingsForProject, outputWorkspaces } from "./utilities";

/**
 * Post-install go through and write this project's workspaces to a file, enabled by config
 * option.
 *
 * @param project the yarn Project, for configuration and grabbing workspace information
 * @param _options ignored, type not exported by @yarnpkg/core, should be InstallOptions
 */
export function afterAllInstalled(project: Project, _options: unknown): void {
  const settings = getSettingsForProject(project);
  // see if the outputWorkspaces setting is set to a valid json string
  if (!settings.outputOnlyOnCommand && settings.outputPath) {
    outputWorkspaces(project, settings);
  }
}
