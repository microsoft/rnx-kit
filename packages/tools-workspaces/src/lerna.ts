import { existsSync as fileExists } from "fs";
import * as path from "path";
import {
  findPackages,
  findPackagesSync,
  getImplementation,
  getImplementationSync,
  LERNA_JSON,
  readJSON,
  readJSONSync,
  WORKSPACE_ROOT_SENTINELS,
} from "./common";

function filterSentinels(): string[] {
  return WORKSPACE_ROOT_SENTINELS.filter((sentinel) => sentinel !== LERNA_JSON);
}

// https://lerna.js.org/docs/configuration
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const { packages, useWorkspaces } = await readJSON(configFile);
  if (!useWorkspaces) {
    return await findPackages(packages, path.dirname(configFile));
  }

  const root = path.dirname(configFile);
  const sentinels = filterSentinels();
  for (const sentinel of sentinels) {
    const filename = path.join(root, sentinel);
    if (fileExists(filename)) {
      const { findWorkspacePackages } = await getImplementation(filename);
      return await findWorkspacePackages(filename);
    }
  }

  return [];
}

export function findWorkspacePackagesSync(configFile: string): string[] {
  const { packages, useWorkspaces } = readJSONSync(configFile);
  if (!useWorkspaces) {
    return findPackagesSync(packages, path.dirname(configFile));
  }

  const root = path.dirname(configFile);
  const sentinels = filterSentinels();
  for (const sentinel of sentinels) {
    const filename = path.join(root, sentinel);
    if (fileExists(filename)) {
      const { findWorkspacePackagesSync } = getImplementationSync(filename);
      return findWorkspacePackagesSync(filename);
    }
  }

  return [];
}
