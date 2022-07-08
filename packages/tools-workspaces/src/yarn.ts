import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import * as path from "path";
import { findPackages, findPackagesSync } from "./common";

type Manifest = {
  workspaces?: string[] | { packages: string[] };
};

function parse({ workspaces }: Manifest): string[] | undefined {
  return Array.isArray(workspaces) ? workspaces : workspaces?.packages;
}

async function readPackageManifest(root: string): Promise<Manifest> {
  const filename = path.join(root, "package.json");
  const manifest = await readFile(filename, { encoding: "utf-8" });
  return JSON.parse(manifest);
}

function readPackageManifestSync(root: string): Manifest {
  const filename = path.join(root, "package.json");
  const manifest = readFileSync(filename, { encoding: "utf-8" });
  return JSON.parse(manifest);
}

// https://docs.npmjs.com/cli/v8/using-npm/workspaces
// https://yarnpkg.com/configuration/manifest#workspaces
export async function findWorkspacePackages(
  lockfile: string
): Promise<string[]> {
  const root = path.dirname(lockfile);
  const manifest = await readPackageManifest(root);
  return await findPackages(parse(manifest), root);
}

export function findWorkspacePackagesSync(lockfile: string): string[] {
  const root = path.dirname(lockfile);
  const manifest = readPackageManifestSync(root);
  return findPackagesSync(parse(manifest), root);
}
