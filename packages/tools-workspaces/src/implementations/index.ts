import path from "node:path";

export type PackageManager = {
  findWorkspacePackages: (sentinel: string) => Promise<string[]>;
  findWorkspacePackagesSync: (sentinel: string) => string[];
  getPackageFilters: (sentinel: string) => string[] | undefined;
};

export const BUN_LOCKB = "bun.lockb";
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
  BUN_LOCKB,
];

export function getImplementation(sentinel: string): Promise<PackageManager> {
  switch (path.basename(sentinel)) {
    case BUN_LOCKB: // fallthrough — logic defining workspaces config is the same as for npm and yarn
    case PACKAGE_LOCK_JSON: // fallthrough — logic defining workspaces config is the same for npm and yarn
    case YARN_LOCK:
      return import("./yarn.js");

    case LERNA_JSON:
      return import("./lerna.js");

    case PNPM_WORKSPACE_YAML:
      return import("./pnpm.js");

    case RUSH_JSON:
      return import("./rush.js");
  }

  throw new Error(
    `This should not happen - did we forget to add a switch case for '${sentinel}'?`
  );
}

export function getImplementationSync(sentinel: string): PackageManager {
  switch (path.basename(sentinel)) {
    case BUN_LOCKB: // fallthrough — logic defining workspaces config is the same as for npm and yarn
    case PACKAGE_LOCK_JSON: // fallthrough — logic defining workspaces config is the same for npm and yarn
    case YARN_LOCK:
      return require("./yarn");

    case LERNA_JSON:
      return require("./lerna");

    case PNPM_WORKSPACE_YAML:
      return require("./pnpm");

    case RUSH_JSON:
      return require("./rush");
  }

  throw new Error(
    `This should not happen - did we forget to add a switch case for '${sentinel}'?`
  );
}
