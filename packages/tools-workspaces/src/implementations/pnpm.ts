import * as path from "path";
import {
  default as readYamlFile,
  sync as readYamlFileSync,
} from "read-yaml-file";
import { findPackages, findPackagesSync } from "./common";

type Workspace = {
  packages?: string[];
};

// https://pnpm.io/pnpm-workspace_yaml
export async function findWorkspacePackages(
  workspaceYaml: string
): Promise<string[]> {
  const { packages } = await readYamlFile<Workspace>(workspaceYaml);
  return await findPackages(packages, path.dirname(workspaceYaml));
}

export function findWorkspacePackagesSync(workspaceYaml: string): string[] {
  return findPackagesSync(
    getPackageFilters(workspaceYaml),
    path.dirname(workspaceYaml)
  );
}

export function getPackageFilters(workspaceYaml: string): string[] | undefined {
  return readYamlFileSync<Workspace>(workspaceYaml).packages;
}
