import {
  type Descriptor,
  type Fetcher,
  type Ident,
  type Locator,
  type Package,
  type Project,
  type Resolver,
  structUtils,
} from "@yarnpkg/core";
import { npath, type PortablePath, ppath } from "@yarnpkg/fslib";
import fs from "node:fs";
import {
  getFinderFromJsConfig,
  getFinderFromJsonConfig,
  getPluginConfiguration,
} from "./cofiguration";
import { type PackagePaths } from "./types";
import { ExternalWorkspace } from "./workspace";

const nullFunction = (_val: string) => null;
const pkgJson = npath.toPortablePath("package.json");
const emptyPortable = npath.toPortablePath("");

export class ExternalWorkspaceTracker {
  trace = nullFunction;
  report;
  root;

  private project;

  private workspaceMap = new Map<string, ExternalWorkspace>();
  private workspaceByIdent = new Map<string, ExternalWorkspace>();
  private notExternal = new Set<string>();
  private npmPackageByIdent = new Map<string, Package>();

  private resolver: Resolver | null = null;
  private fetcher: Fetcher | null = null;
  private findPackage: (pkgName: string) => PackagePaths | null = nullFunction;
  private pathOffset: PortablePath = npath.toPortablePath("");

  constructor(project: Project) {
    this.trace = nullFunction;
    this.report = (msg: string) => console.log(msg);
    this.root = project.cwd;
    this.project = project;

    // load the finder if we can, if it fails everything will be disabled
    const { provider } = getPluginConfiguration(project.configuration);
    if (provider) {
      if (provider.endsWith(".json")) {
        this.pathOffset = this.findConfigPathOffset(provider);
        this.findPackage = getFinderFromJsonConfig(provider);
      } else if (provider.endsWith(".js") || provider.endsWith(".cjs")) {
        this.pathOffset = this.findConfigPathOffset(provider);
        this.findPackage = getFinderFromJsConfig(provider);
      }
    }
  }

  private findConfigPathOffset(configPath: PortablePath): PortablePath {
    const dirPath = ppath.dirname(configPath);
    return ppath.relative(this.root, dirPath);
  }

  private tryNameLookup(pkgName: string) {
    return this.workspaceMap.get(pkgName) || null;
  }

  private createWorkspace(
    name: string,
    localPath: PortablePath
  ): ExternalWorkspace {
    const prettyName = structUtils.prettyIdent(
      this.project.configuration,
      structUtils.parseIdent(name)
    );
    return new ExternalWorkspace(name, prettyName, localPath, this.trace);
  }

  /**
   * Lookup and load a workspace for an ident, assumes that:
   * - it is not in our lookup caches
   * - it is not a regular workspace
   * - we have not looked it up before
   *
   * @param ident the ident to try to load if it is an external workspace
   * @returns a loaded ExternalWorkspace or null if not found
   */
  private tryIdentLoad(ident: Ident) {
    const pkgName = structUtils.stringifyIdent(ident);
    let workspace = this.tryNameLookup(pkgName);
    if (workspace) {
      this.workspaceByIdent.set(ident.identHash, workspace);
      return workspace;
    }
    // now look it up in the attached external workspaces
    const pkgInfo = this.findPackage(pkgName);
    if (pkgInfo) {
      // see if a package.json exists at the destination path
      let localPath = npath.toPortablePath(pkgInfo.path || "");
      if (localPath) {
        if (!ppath.isAbsolute(localPath)) {
          localPath = ppath.join(this.root, this.pathOffset, localPath);
          if (!fs.existsSync(ppath.join(localPath, pkgJson))) {
            localPath = emptyPortable;
          }
        }
      }

      workspace = this.createWorkspace(pkgName, localPath);
      this.trace(
        `Loaded external workspace ${workspace.prettyName} of type ${pkgInfo.path ? "LOCAL" : "REMOTE"}`
      );
      this.workspaceMap.set(pkgName, workspace);
      this.workspaceByIdent.set(ident.identHash, workspace);
      return workspace;
    }
    // not an external workspace
    this.notExternal.add(ident.identHash);
    return null;
  }

  setFallbackPackage(descriptor: Descriptor, pkg: Package) {
    this.npmPackageByIdent.set(descriptor.identHash, pkg);
  }

  getFallbackPackage(descriptor: Descriptor) {
    return this.npmPackageByIdent.get(descriptor.identHash);
  }

  /**
   * See if the descriptor references an external workspace, trying the cache first, before doing a real lookup
   * @param descriptor the descriptor to try to find
   * @returns a Workspace if this is an external workspace, or null
   */
  tryByDescriptor(descriptor: Descriptor) {
    // return quick success if already loaded
    if (this.workspaceByIdent.has(descriptor.identHash)) {
      return this.workspaceByIdent.get(descriptor.identHash);
    }
    // return quick failure if we tried and failed before or if it is a regular workspace
    if (
      this.notExternal.has(descriptor.identHash) ||
      this.project.tryWorkspaceByDescriptor(descriptor)
    ) {
      return null;
    }
    // otherwise do the more involved lookup
    return this.tryIdentLoad(descriptor);
  }

  findByDescriptor(descriptor: Descriptor) {
    const workspace = this.tryByDescriptor(descriptor);
    if (!workspace) {
      throw new Error(
        `Cannot find workspace for descriptor ${structUtils.stringifyDescriptor(
          descriptor
        )}`
      );
    }
    return workspace;
  }

  /**
   * See if the locator references an external workspace, trying the cache first, before doing a real lookup
   * @param locator the descriptor to try to find
   * @returns a Workspace if this is an external workspace, or null
   */
  tryByLocator(locator: Locator) {
    // return quick success if already loaded
    if (this.workspaceByIdent.has(locator.identHash)) {
      return this.workspaceByIdent.get(locator.identHash);
    }
    // return quick failure if we tried and failed before or if it is a regular workspace
    if (
      this.notExternal.has(locator.identHash) ||
      this.project.tryWorkspaceByLocator(locator)
    ) {
      return null;
    }
    // otherwise do the more involved lookup
    return this.tryIdentLoad(locator);
  }

  findByLocator(locator: Locator) {
    const workspace = this.tryByLocator(locator);
    if (!workspace) {
      throw new Error(
        `Cannot find workspace for locator ${structUtils.stringifyLocator(
          locator
        )}`
      );
    }
    return workspace;
  }

  getResolver() {
    this.resolver ??= this.project.configuration.makeResolver();
    return this.resolver;
  }

  getFetcher() {
    this.fetcher ??= this.project.configuration.makeFetcher();
    return this.fetcher;
  }
}

let workspaceTracker: ExternalWorkspaceTracker | null = null;

export function getWorkspaceTracker(
  project: Project
): ExternalWorkspaceTracker {
  if (!workspaceTracker) {
    workspaceTracker = new ExternalWorkspaceTracker(project);
  }
  return workspaceTracker;
}
