import { readPackage } from "@rnx-kit/tools-node";
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
   * @param cacheOnly Just check to see if it has been loaded, don't load the workspaces
   * @returns a package info object for the workspace (if it exists)
   */
  getWorkspace(name: string, cacheOnly?: boolean) {
    const cachedResult = this.byName.get(name);
    if (cachedResult || cacheOnly) {
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
 * Load the package info by name, loading the project workspaces if necessary
 *
 * @param name name of the package to load
 * @param cacheOnly only check if the package is in the cache, don't load workspaces if not
 * @returns the package info for the package
 */
export function getPackageInfoFromWorkspaces(
  name: string,
  cacheOnly?: boolean
) {
  return ensureCache().getWorkspace(name, cacheOnly);
}

/**
 * @returns the root package info
 */
export function getRootPackageInfo(): PackageInfo {
  return ensureCache().getRootInfo();
}
