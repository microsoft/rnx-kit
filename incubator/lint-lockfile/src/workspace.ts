import { getWorkspacesInfoSync } from "@rnx-kit/tools-workspaces";
import * as fs from "node:fs";
import * as path from "node:path";
import { noWorkspacePackageFromNpmRule } from "./rules/noWorkspacePackageFromNpm.ts";
import type { Lockfile, Workspace } from "./types";
import { loadLockfile as loadYarnLockfile } from "./yarn/lockfile.ts";

function loadLockfile(lockfilePath: string): Lockfile {
  switch (path.basename(lockfilePath)) {
    case "yarn.lock":
      return loadYarnLockfile(lockfilePath);
    default:
      throw new Error("Unsupported package manager");
  }
}

function loadWorkspacePackages(workspaces: string[]): string[] {
  const asText = { encoding: "utf-8" } as const;
  return workspaces.map((workspace) => {
    const pkg = fs.readFileSync(path.join(workspace, "package.json"), asText);
    const { name } = JSON.parse(pkg);
    return name;
  });
}

export function loadWorkspace(): Workspace & { packages: string[] } {
  const workspaceInfo = getWorkspacesInfoSync();
  return {
    lockfile: loadLockfile(workspaceInfo.getLockfile()),
    packages: loadWorkspacePackages(workspaceInfo.findPackagesSync()),
    rules: [noWorkspacePackageFromNpmRule()],
  };
}
