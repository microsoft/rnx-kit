import { existsSync as fileExists, readFileSync } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
import {
  findPackages,
  findPackagesSync,
  getImplementation,
  getImplementationSync,
  LERNA_JSON,
  WORKSPACE_ROOT_SENTINELS,
} from "./common";

function filterSentinels(): string[] {
  return WORKSPACE_ROOT_SENTINELS.filter((sentinel) => sentinel !== LERNA_JSON);
}

// https://lerna.js.org/docs/configuration
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const config = await readFile(configFile, { encoding: "utf-8" });
  const { packages, useWorkspaces } = JSON.parse(config);
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
  const config = readFileSync(configFile, { encoding: "utf-8" });
  const { packages, useWorkspaces } = JSON.parse(config);
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
