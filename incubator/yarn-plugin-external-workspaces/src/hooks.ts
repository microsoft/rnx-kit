import {
  type ExternalDeps,
  writeOutWorkspaces,
} from "@rnx-kit/tools-workspaces/external";
import { type Project, structUtils } from "@yarnpkg/core";
import { getSettingsFromProject } from "./configuration";

/**
 * Post-install go through and write this project's workspaces to a file, enabled by config
 * option.
 *
 * @param project the yarn Project, for configuration and grabbing workspace information
 * @param _options ignored, type not exported by @yarnpkg/core, should be InstallOptions
 */
export function afterAllInstalled(project: Project, _options: unknown): void {
  const { outputWorkspaces } = getSettingsFromProject(project);
  // see if the outputWorkspaces setting is set to a valid json string
  if (outputWorkspaces && outputWorkspaces.indexOf(".json") !== -1) {
    const deps: ExternalDeps = {};
    // iterate the workspaces and add them to the deps object
    project.workspacesByIdent.forEach((workspace) => {
      const { name: ident, version, private: isPrivate } = workspace.manifest;
      if (ident && version && !isPrivate) {
        const name = structUtils.stringifyIdent(ident);
        deps[name] = { version, path: workspace.cwd };
      }
    });
    // output the deps object
    writeOutWorkspaces(deps, outputWorkspaces);
  }
}
