import { readPackage } from "@rnx-kit/tools-node";
import path from "node:path";
import { getPackageInfoCache } from "./cache";
import type { PackageInfo } from "./types";

export function createPackageInfoAccessor<T>(
  symbolKey: symbol,
  initialize: (pkgInfo: PackageInfo) => T
) {
  return (pkgInfo: PackageInfo) => {
    if (!(symbolKey in pkgInfo)) {
      pkgInfo[symbolKey] = initialize(pkgInfo);
    }
    return pkgInfo[symbolKey] as T;
  };
}

/**
 * @param pkgPath path to the package.json or the root of the package
 * @returns (potentially cached) package info for this package
 */
export function getPackageInfoFromPath(pkgPath: string): PackageInfo {
  // set up the root path of the package
  const isPkgPath = path.basename(pkgPath).toLowerCase() === "package.json";
  const root = isPkgPath ? path.dirname(pkgPath) : pkgPath;

  // check if it is in the cache, if so return it
  const cache = getPackageInfoCache();
  const cachedResult = cache.getByRoot(root);
  if (cachedResult) {
    return cachedResult;
  }

  // otherwise finish loading the package info, then cache and return it
  const manifest = readPackage(pkgPath);
  const workspace = cache.isWorkspace(root);

  // it's not a valid package if the manifest can't be laoded
  if (!manifest) {
    throw new Error(`No package.json found at ${pkgPath}`);
  }

  // create a new entry, cache it, and return it
  const result = {
    name: manifest.name,
    root,
    manifest,
    workspace,
  };
  cache.store(result);
  return result;
}
