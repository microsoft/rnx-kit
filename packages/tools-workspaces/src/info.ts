import micromatch from "micromatch";
import * as path from "node:path";
import {
  findPackages,
  findPackagesSync,
  getImplementationSync,
} from "./common";
import type { WorkspacesInfo } from "./types";

export class WorkspacesInfoImpl implements WorkspacesInfo {
  private root: string;
  private packageFilter: string[] | undefined;
  private packages: string[] | undefined;
  private findWorkspacePackages: (sentinal: string) => Promise<string[]>;
  private findWorkspacePackagesSync: (sentinal: string) => string[];

  constructor(private sentinel: string) {
    this.root = path.dirname(sentinel);
    const {
      getPackageFilters,
      findWorkspacePackages,
      findWorkspacePackagesSync,
    } = getImplementationSync(sentinel);
    this.packageFilter = getPackageFilters(this.sentinel);
    this.findWorkspacePackages = findWorkspacePackages;
    this.findWorkspacePackagesSync = findWorkspacePackagesSync;
  }

  getLockfile() {
    return this.sentinel;
  }

  getRoot() {
    return this.root;
  }

  async findPackages(): Promise<string[]> {
    if (!this.packages) {
      this.packages = await this.loadPackages();
    }
    return this.packages;
  }

  findPackagesSync(): string[] {
    if (!this.packages) {
      this.packages = this.loadPackagesSync();
    }
    return this.packages;
  }

  isWorkspace(packageRoot: string): boolean {
    // if there is a package filter
    if (this.packageFilter) {
      // do glob matching to see if this fits the pattern
      const relative = path.relative(this.root, packageRoot);
      return micromatch.isMatch(relative, this.packageFilter);
    }
    // load or retrieve the cached packages and compare against that
    const packages = this.findPackagesSync();
    return packages.includes(packageRoot);
  }

  private loadPackagesSync() {
    if (this.packageFilter) {
      return findPackagesSync(this.packageFilter, this.root);
    }
    return this.findWorkspacePackagesSync(this.sentinel);
  }

  private loadPackages() {
    if (this.packageFilter) {
      return findPackages(this.packageFilter, this.root);
    }
    return this.findWorkspacePackages(this.sentinel);
  }
}
