/**
 * Helper interface that caches results in-between calls and can test if a package is in the workspace
 * without having to load all the packages (in most cases)
 */
export type WorkspacesInfo = {
  /** root folder for the workspaces */
  getRoot: () => string | undefined;

  /** find all package directories synchronously */
  findPackagesSync: () => string[];

  /** find all package directories asynchronously */
  findPackages: () => Promise<string[]>;

  /** test if a package root is a workspace without loading all the packages */
  isWorkspace: (packageRoot: string) => boolean;
};
