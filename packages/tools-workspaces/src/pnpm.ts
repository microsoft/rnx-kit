import * as yaml from "js-yaml";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { findPackages, findPackagesSync } from "./common.ts";

type Workspace = {
  packages?: string[];
};

// https://pnpm.io/pnpm-workspace_yaml
export async function findWorkspacePackages(
  workspaceYaml: string
): Promise<string[]> {
  const content = await readFile(workspaceYaml, { encoding: "utf-8" });
  const { packages } = yaml.load(content) as Workspace;
  return await findPackages(packages, path.dirname(workspaceYaml));
}

export function findWorkspacePackagesSync(workspaceYaml: string): string[] {
  return findPackagesSync(
    getPackageFilters(workspaceYaml),
    path.dirname(workspaceYaml)
  );
}

export function getPackageFilters(workspaceYaml: string): string[] | undefined {
  const content = readFileSync(workspaceYaml, { encoding: "utf-8" });
  return (yaml.load(content) as Workspace).packages;
}
