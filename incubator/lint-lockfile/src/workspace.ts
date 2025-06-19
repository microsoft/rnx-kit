import { getKitConfig } from "@rnx-kit/config";
import type { WorkspacesInfo } from "@rnx-kit/tools-workspaces";
import { getWorkspacesInfoSync } from "@rnx-kit/tools-workspaces";
import * as fs from "node:fs";
import * as path from "node:path";
import { noDuplicatesRule } from "./rules/noDuplicates.ts";
import { noWorkspacePackageFromNpmRule } from "./rules/noWorkspacePackageFromNpm.ts";
import type { Lockfile, Rule, Workspace } from "./types";
import { loadLockfile as loadYarnLockfile } from "./yarn/lockfile.ts";

function loadLockfile(lockfilePath: string): Lockfile {
  switch (path.basename(lockfilePath)) {
    case "yarn.lock":
      return loadYarnLockfile(lockfilePath);
    default:
      throw new Error("Unsupported package manager");
  }
}

function loadRules(workspaceInfo: WorkspacesInfo): Rule[] {
  const rules: Rule[] = [];

  const config = getKitConfig({ cwd: workspaceInfo.getRoot() });
  const lintConfig = config?.lint?.lockfile ?? {};

  const noDuplicates = noDuplicatesRule(lintConfig.noDuplicates);
  if (noDuplicates) {
    rules.push(noDuplicates);
  }

  const noWorkspacePackageFromNpm = noWorkspacePackageFromNpmRule(
    lintConfig.noWorkspacePackageFromNpm
  );
  if (noWorkspacePackageFromNpm) {
    rules.push(noWorkspacePackageFromNpm);
  }

  return rules;
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
  let workspacePackages: string[];
  return {
    lockfile: loadLockfile(workspaceInfo.getLockfile()),
    rules: loadRules(workspaceInfo),
    get packages() {
      // Lazy load the packages to avoid unnecessary file system access
      if (!workspacePackages) {
        const packages = workspaceInfo.findPackagesSync();
        workspacePackages = loadWorkspacePackages(packages);
      }
      return workspacePackages;
    },
  };
}
