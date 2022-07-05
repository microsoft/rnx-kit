import fg from "fast-glob";
import findUp from "find-up";
import * as path from "node:path";

type PackageManager = {
  findWorkspacePackages: (sentinel: string) => Promise<string[]>;
};

export const LERNA_JSON = "lerna.json";
export const PACKAGE_LOCK_JSON = "package-lock.json";
export const PNPM_WORKSPACE_YAML = "pnpm-workspace.yaml";
export const RUSH_JSON = "rush.json";
export const YARN_LOCK = "yarn.lock";

export const WORKSPACE_ROOT_SENTINELS = [
  LERNA_JSON,
  RUSH_JSON,
  YARN_LOCK,
  PACKAGE_LOCK_JSON,
  PNPM_WORKSPACE_YAML,
];

export async function findPackages(
  patterns: string[] | undefined,
  cwd: string
): Promise<string[]> {
  if (!Array.isArray(patterns)) {
    return [];
  }

  return await fg(patterns, {
    cwd,
    ignore: ["**/Pods/**", "**/bower_components/**", "**/node_modules/**"],
    absolute: true,
    onlyDirectories: true,
  });
}

export const findSentinel = (() => {
  let result: Promise<string | undefined>;
  return () => {
    if (process.env.JEST_WORKER_ID || !result) {
      result = findUp(WORKSPACE_ROOT_SENTINELS);
    }
    return result;
  };
})();

export function getImplementation(sentinel: string): Promise<PackageManager> {
  switch (path.basename(sentinel)) {
    case PACKAGE_LOCK_JSON: // fallthrough - logic defining workspaces config is the same for npm and yarn
    case YARN_LOCK:
      return import("./yarn");

    case LERNA_JSON:
      return import("./lerna");

    case PNPM_WORKSPACE_YAML:
      return import("./pnpm");

    case RUSH_JSON:
      return import("./rush");
  }

  throw new Error("This should not happen");
}
