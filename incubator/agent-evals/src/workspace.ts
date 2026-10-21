import * as fs from "node:fs";
import * as path from "node:path";
import { toRelativePath, tryReadJSON } from "./common.ts";

/**
 * Returns the directories of the workspace packages in the checkout, relative
 * to its root, keyed by package name.
 *
 * Note: `@rnx-kit/tools-workspaces` only finds the workspace of the current
 * working directory and caches the result, so it cannot be used here.
 */
export function workspacePackages(workdir: string): Map<string, string> {
  const packages = new Map<string, string>();
  const { workspaces = [] } =
    tryReadJSON(path.join(workdir, "package.json")) ?? {};
  const patterns: string[] = Array.isArray(workspaces)
    ? workspaces
    : (workspaces.packages ?? []);
  const manifests = fs.globSync(
    patterns.map((pattern) => `${pattern}/package.json`),
    { cwd: workdir }
  );
  for (const manifest of manifests) {
    // The agent may have left a manifest in an invalid state
    const name = tryReadJSON(path.join(workdir, manifest))?.name;
    if (name) {
      const dir = path.dirname(path.join(workdir, manifest));
      packages.set(name, toRelativePath(workdir, dir));
    }
  }
  return packages;
}

export function lazyWorkspacePackages(
  workdir: string
): () => Map<string, string> {
  let packages: Map<string, string> | undefined;
  return () => (packages ??= workspacePackages(workdir));
}

/**
 * Returns the directory of the workspace package containing the specified
 * file, relative to the root of the checkout, or `.` if it is not in one.
 * Unlike looking for the nearest `package.json`, this skips manifests of
 * test fixtures.
 */
export function owningPackageDir(
  packageDirs: Iterable<string>,
  file: string
): string {
  let owner = ".";
  for (const dir of packageDirs) {
    if (file.startsWith(`${dir}/`) && dir.length > owner.length) {
      owner = dir;
    }
  }
  return owner;
}
