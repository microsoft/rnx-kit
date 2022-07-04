import fg from "fast-glob";
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
  let result: string | undefined;
  return async () => {
    if (process.env.JEST_WORKER_ID || !result) {
      const findUp = require("find-up");
      result = await findUp(WORKSPACE_ROOT_SENTINELS);
    }
    return result;
  };
})();

export async function getImplementation(
  sentinel: string
): Promise<PackageManager> {
  switch (path.basename(sentinel)) {
    case PACKAGE_LOCK_JSON: // fallthrough
    case YARN_LOCK:
      return await import("./yarn");

    case LERNA_JSON:
      return await import("./lerna");

    case PNPM_WORKSPACE_YAML:
      return await import("./pnpm");

    case RUSH_JSON:
      return await import("./rush");
  }

  throw new Error("This should not happen");
}
