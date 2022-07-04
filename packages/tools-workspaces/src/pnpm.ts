import * as path from "node:path";
import readYamlFile from "read-yaml-file";
import { findPackages } from "./common";

type PnpmWorkspace = {
  packages?: string[];
};

// https://pnpm.io/pnpm-workspace_yaml
export async function findWorkspacePackages(
  workspaceYaml: string
): Promise<string[]> {
  const { packages } = await readYamlFile<PnpmWorkspace>(workspaceYaml);
  return await findPackages(packages, path.dirname(workspaceYaml));
}
