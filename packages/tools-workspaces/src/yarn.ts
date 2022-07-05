import * as fs from "node:fs/promises";
import * as path from "node:path";
import { findPackages } from "./common";

type Manifest = {
  workspaces?: string[] | { packages: string[] };
};

async function readPackageManifest(root: string): Promise<Manifest> {
  const filename = path.join(root, "package.json");
  const manifest = await fs.readFile(filename, { encoding: "utf-8" });
  return JSON.parse(manifest);
}

// https://docs.npmjs.com/cli/v8/using-npm/workspaces
// https://yarnpkg.com/configuration/manifest#workspaces
export async function findWorkspacePackages(
  lockfile: string
): Promise<string[]> {
  const root = path.dirname(lockfile);
  const { workspaces } = await readPackageManifest(root);
  const patterns = Array.isArray(workspaces)
    ? workspaces
    : workspaces?.packages;
  return await findPackages(patterns, root);
}
