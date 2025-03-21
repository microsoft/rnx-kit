import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { getWorkspacesInfoSync } from "@rnx-kit/tools-workspaces";
import path from "node:path";
import type { PackageInfo } from "./types";

class PackageInfoCache {
  private workspaceInfo;
  private byName = new Map<string, PackageInfo>();
  private byRoot = new Map<string, PackageInfo>();
  private loadedWorkspaces = false;
  private rootPath;

  constructor() {
    this.workspaceInfo = getWorkspacesInfoSync();
    this.rootPath = this.workspaceInfo.getRoot();
  }

  /**
   * @returns the root package info
   */
  getRootInfo(): PackageInfo {
    return this.getByPath(this.rootPath);
  }

  /**
   * @param pkgPath path to the package.json or the root of the package
   * @returns loaded PackageInfo for the package, or throws an exception if not found
   */
  getByPath(pkgPath: string): PackageInfo {
    const [root, manifestPath] = this.getPackagePaths(pkgPath);

    if (!this.byRoot.has(root)) {
      // it's not in the cache so load it
      const manifest = readPackage(manifestPath);
      const workspace = this.isWorkspace(root);

      // it's not a valid package if the manifest can't be laoded
      if (manifest) {
        // create a new entry and cache it
        this.store({ name: manifest.name, root, manifest, workspace });
      }
    }

    const result = this.byRoot.get(root);
    if (!result) {
      throw new Error(`No package.json found at ${pkgPath}`);
    }
    return result;
  }

  /**
   * @param name the package to load, only valid for workspaces
   * @param loadWorkspacesIfNotFound do the expensive workspace load if not found
   * @returns a package info object for the workspace (if it exists)
   */
  getWorkspace(name: string, loadWorkspacesIfNotFound?: boolean) {
    const cachedResult = this.byName.get(name);
    if (cachedResult || !loadWorkspacesIfNotFound) {
      return cachedResult;
    }

    // load the workspaces if we haven't already which will populate the name cache
    this.loadWorkspaces();
    return this.byName.get(name);
  }

  /** ensure the workspaces are fully loaded */
  private loadWorkspaces() {
    if (!this.loadedWorkspaces) {
      const packagePaths = this.workspaceInfo?.findPackagesSync() ?? [];
      for (const packagePath of packagePaths) {
        getPackageInfoFromPath(packagePath);
      }
      this.loadedWorkspaces = true;
    }
  }

  /** return the root package path and the package.json path for a path that could be either */
  private getPackagePaths(pkgPath: string): [string, string] {
    const isPkgPath = path.basename(pkgPath).toLowerCase() === "package.json";
    return isPkgPath
      ? [path.dirname(pkgPath), pkgPath]
      : [pkgPath, path.join(pkgPath, "package.json")];
  }

  /** set the package info into the caches as appropriate */
  private store(pkgInfo: PackageInfo) {
    if (pkgInfo.workspace) {
      this.byName.set(pkgInfo.name, pkgInfo);
    }
    this.byRoot.set(pkgInfo.root, pkgInfo);
  }

  /** check if this package is a workspace */
  private isWorkspace(root: string) {
    return Boolean(this.workspaceInfo?.isWorkspace(root));
  }
}

let cache: PackageInfoCache | undefined = undefined;
function ensureCache() {
  if (!cache) {
    cache = new PackageInfoCache();
  }
  return cache;
}

/**
 * Looks up a package info by path, loading it if necessary
 *
 * @param pkgPath path to the package.json or the root of the package
 * @returns (potentially cached) package info for this package
 */
export function getPackageInfoFromPath(pkgPath: string): PackageInfo {
  return ensureCache().getByPath(pkgPath);
}

/**
 * Finds a package info by path, looking up the tree if necessary
 * @param startPath the path to start looking from or undefined to start from the current working directory
 * @returns the nearest package info from the start path
 */
export function findPackageInfo(startPath?: string): PackageInfo {
  const packagePath = findPackage(startPath);
  if (!packagePath) {
    throw new Error(`No package.json found from ${startPath ?? process.cwd()}`);
  }
  return getPackageInfoFromPath(packagePath);
}

/**
 * Load the package info by name, loading the project workspaces if necessary
 *
 * @param name name of the package to load
 * @param loadWorkspacesIfNotFound if the package is not in the cache load the workspaces (potentially expensive)
 * @returns the package info for the package
 */
export function getPackageInfoFromWorkspaces(
  name: string,
  loadWorkspacesIfNotFound?: boolean
) {
  return ensureCache().getWorkspace(name, loadWorkspacesIfNotFound);
}

/**
 * @returns the root package info
 */
export function getRootPackageInfo(): PackageInfo {
  return ensureCache().getRootInfo();
}
