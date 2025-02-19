import {
  type ExternalDeps,
  type TraceFunc,
  writeOutWorkspaces,
} from "@rnx-kit/tools-workspaces/external";
import { type Project, structUtils } from "@yarnpkg/core";

/**
 * @param project yarn Project for this repo
 * @param target target path to write out workspace information to
 * @param includePrivate whether to include private packages
 * @param checkOnly only test to see whether there are unwritten changes
 * @param trace output logging information for the operation
 */
export function outputWorkspaces(
  project: Project,
  target: string,
  includePrivate: boolean | undefined,
  checkOnly: boolean,
  trace: TraceFunc
): void {
  if (target.indexOf(".json") === -1) {
    trace(`Invalid output path: ${target}, must reference a .json file`);
  } else {
    const deps: ExternalDeps = {};
    // iterate the workspaces and add them to the deps object
    project.workspacesByIdent.forEach((workspace) => {
      const { name: ident, version, private: isPrivate } = workspace.manifest;
      if (ident && version && (!isPrivate || includePrivate)) {
        const name = structUtils.stringifyIdent(ident);
        deps[name] = { version, path: workspace.cwd };
      }
    });

    // output the deps object
    writeOutWorkspaces(deps, target, checkOnly, trace);
  }
}
