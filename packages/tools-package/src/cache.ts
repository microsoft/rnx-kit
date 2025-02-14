import { getWorkspacesInfoSync } from "@rnx-kit/tools-workspaces";
import { PackageInfo } from "./types";

let cache: PackageInfoCache | undefined = undefined;

class PackageInfoCache {
  private workspaceInfo;
  private byName = new Map<string, PackageInfo>();
  private byRoot = new Map<string, PackageInfo>();

  constructor() {
    this.workspaceInfo = getWorkspacesInfoSync();
  }

  isWorkspace(root: string) {
    return Boolean(this.workspaceInfo?.isWorkspace(root));
  }

  getByName(name: string) {
    return this.byName.get(name);
  }

  getByRoot(root: string) {
    return this.byRoot.get(root);
  }

  store(pkgInfo: PackageInfo) {
    this.byName.set(pkgInfo.name, pkgInfo);
    this.byRoot.set(pkgInfo.root, pkgInfo);
  }
}

export function getPackageInfoCache() {
  if (!cache) {
    cache = new PackageInfoCache();
  }
  return cache;
}
