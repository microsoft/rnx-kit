import {
  type Descriptor,
  type Locator,
  type Project,
  type ResolveOptions,
  type Resolver,
} from "@yarnpkg/core";
import { getWorkspaceTracker } from "./tracker";
import {
  getSettingsForProject,
  outputWorkspaces,
  toExternalDescriptor,
  toFallbackDescriptor,
} from "./utilities";

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

/**
 * Called during the resolution, once for each resolved package and each of
 * their dependencies. By returning a new dependency descriptor you can
 * replace the original one by a different range.
 *
 * Note that when multiple plugins are registered on `reduceDependency` they
 * will be executed in definition order. In that case, `dependency` will
 * always refer to the dependency as it currently is, whereas
 * `initialDependency` will be the descriptor before any plugin attempted to
 * change it.
 *
 * This allows the plugin to intercept dependencies and replace them with descriptors that map
 * to the external protocol.
 */
export async function reduceDependency(
  dependency: Descriptor,
  project: Project,
  _locator: Locator,
  _initialDependency: Descriptor,
  _extra: { resolver: Resolver; resolveOptions: ResolveOptions }
) {
  const tracker = getWorkspaceTracker(project);
  const workspace = tracker.tryByDescriptor(dependency);
  if (workspace) {
    if (workspace.localPath) {
      tracker.trace(`Reducing ${workspace.name} to external descriptor`);
      return toExternalDescriptor(dependency);
    }
    tracker.trace(`Reducing ${workspace.name} to fallback descriptor`);
    return toFallbackDescriptor(dependency);
  }
  return dependency;
}
