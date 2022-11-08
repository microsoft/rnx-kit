import * as path from "path";
import {
  findPackages,
  findPackagesSync,
  readJSON,
  readJSONSync,
} from "./common";

type Manifest = {
  workspaces?: string[] | { packages: string[] };
};

function parse({ workspaces }: Manifest): string[] | undefined {
  return Array.isArray(workspaces) ? workspaces : workspaces?.packages;
}

// https://docs.npmjs.com/cli/v8/using-npm/workspaces
// https://yarnpkg.com/configuration/manifest#workspaces
export async function findWorkspacePackages(
  lockfile: string
): Promise<string[]> {
  const root = path.dirname(lockfile);
  const manifest = await readJSON(path.join(root, "package.json"));
  return await findPackages(parse(manifest), root);
}

export function findWorkspacePackagesSync(lockfile: string): string[] {
  const root = path.dirname(lockfile);
  const manifest = readJSONSync(path.join(root, "package.json"));
  return findPackagesSync(parse(manifest), root);
}
