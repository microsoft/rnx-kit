import {
  type Descriptor,
  type Locator,
  type Project,
  type Report,
  type ResolveOptions,
  type Resolver,
} from "@yarnpkg/core";
import { npath } from "@yarnpkg/fslib";
import { getPluginConfiguration } from "./cofiguration";
import { outputWorkspaces } from "./outputCommand";
import { getWorkspaceTracker } from "./tracker";

/**
 * Post-install go through and write this project's workspaces to a file, enabled by config
 * option.
 *
 * @param project the yarn Project, for configuration and grabbing workspace information
 * @param _options ignored, type not exported by @yarnpkg/core, should be InstallOptions
 */
export function afterAllInstalled(
  project: Project,
  options: { report: Report }
): void {
  const settings = getPluginConfiguration(project.configuration);
  // see if the outputWorkspaces setting is set to a valid json string
  if (!settings.outputOnlyOnCommand && settings.outputPath) {
    const report = (msg: string) => options.report.reportInfo(null, msg);
    outputWorkspaces(
      project,
      npath.toPortablePath(settings.outputPath),
      false,
      report
    );
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
  return workspace?.toLeadDescriptor(dependency) ?? dependency;
}
