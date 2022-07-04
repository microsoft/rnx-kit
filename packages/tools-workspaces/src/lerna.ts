import { existsSync as fileExists } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  findPackages,
  getImplementation,
  LERNA_JSON,
  WORKSPACE_ROOT_SENTINELS,
} from "./common";

// https://lerna.js.org/docs/configuration
export async function findWorkspacePackages(
  configFile: string
): Promise<string[]> {
  const config = await fs.readFile(configFile, { encoding: "utf-8" });
  const { packages, useWorkspaces } = JSON.parse(config);
  if (!useWorkspaces) {
    return await findPackages(packages, path.dirname(configFile));
  }

  const root = path.dirname(configFile);
  const sentinels = WORKSPACE_ROOT_SENTINELS.filter(
    (sentinel) => sentinel !== LERNA_JSON
  );
  for (const sentinel of sentinels) {
    const filename = path.join(root, sentinel);
    if (fileExists(filename)) {
      const { findWorkspacePackages } = await getImplementation(filename);
      return await findWorkspacePackages(filename);
    }
  }

  return [];
}
