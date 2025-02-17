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

  // `useWorkspaces` was deprecated: https://github.com/lerna/lerna/releases/tag/7.0.0
  // respect Lerna `packages` property
  if (packages && useWorkspaces !== true) {
    return await findPackages(packages, path.dirname(configFile));
  }

  // fall back to alternative sentinel regardless of `useWorkspaces`
  const root = path.dirname(configFile);
  const sentinels = filterSentinels();
  for (const sentinel of sentinels) {
    const filename = path.join(root, sentinel);
    if (fileExists(filename)) {
      const { findWorkspacePackages } = await getImplementation(filename);
      return await findWorkspacePackages(filename);
    }
  }

  // return empty list if there is no alternative to fall back to
  return [];
}

export function findWorkspacePackagesSync(configFile: string): string[] {
  const packages = getPackageFilters(configFile);
  if (packages) {
    return findPackagesSync(packages, path.dirname(configFile));
  }

  return [];
}

export function getPackageFilters(configFile: string): string[] | undefined {
  const { packages, useWorkspaces } = readJSONSync(configFile);
  // `useWorkspaces` was deprecated: https://github.com/lerna/lerna/releases/tag/7.0.0
  // respect Lerna `packages` property
  if (packages && useWorkspaces !== true) {
    return packages;
  }

  const root = path.dirname(configFile);
  const sentinels = filterSentinels();
  for (const sentinel of sentinels) {
    const filename = path.join(root, sentinel);
    if (fileExists(filename)) {
      const { getPackageFilters } = getImplementationSync(filename);
      return getPackageFilters(filename);
    }
  }

  return undefined;
}
