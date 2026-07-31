import * as yaml from "js-yaml";
import * as path from "node:path";
import { findPackages, findPackagesSync } from "./common.ts";

type Workspace = {
  packages?: string[];
};

// https://pnpm.io/pnpm-workspace_yaml
export async function findWorkspacePackages(
  workspaceYaml: string
): Promise<string[]> {
  const { packages } = yaml.load(workspaceYaml) as Workspace;
  return await findPackages(packages, path.dirname(workspaceYaml));
}

export function findWorkspacePackagesSync(workspaceYaml: string): string[] {
  return findPackagesSync(
    getPackageFilters(workspaceYaml),
    path.dirname(workspaceYaml)
  );
}

export function getPackageFilters(workspaceYaml: string): string[] | undefined {
  return (yaml.load(workspaceYaml) as Workspace).packages;
}
