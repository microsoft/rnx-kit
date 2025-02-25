import {
  type ExternalWorkspaces,
  getExternalWorkspaces,
} from "@rnx-kit/tools-workspaces/external";
import {
  type Descriptor,
  type Fetcher,
  type FetchOptions,
  type Ident,
  type Locator,
  type Project,
  type ResolveOptions,
  type Resolver,
  structUtils,
} from "@yarnpkg/core";
import { type PortablePath, npath } from "@yarnpkg/fslib";
import semver from "semver";
import {
  decodeDescriptorRange,
  encodeRange,
  versionFromDescriptorRange,
} from "./utilities";

type WorkspaceTarget = "files" | "tgz" | "fallback";

type Workspace = {
  // package name, including scope
  name: string;
  // the type of workspace, files for local files, tgz for a tarball, fallback for npm resolution
  target: WorkspaceTarget;
  // relative path from repo root
  localPath: PortablePath;
  // the descriptors that reference this workspace
  descriptors: Descriptor[];
  // the locators that reference this workspace
  locators: Locator[];
  // if this is a workspace that is blocking binding, this is temporary during fallback resolution
  // so we don't infinite loop trying to bind -> fallback -> bind -> fallback and so on
  blockBinding?: boolean;
};

type IdentWorker<T extends Ident> = {
  isRegularWorkspace(ident: T, project: Project): boolean;
  addIdentToWorkspace(ident: T, workspace: Workspace): void;
};

const descriptorWorker: IdentWorker<Descriptor> = {
  isRegularWorkspace(ident, project) {
    return project.tryWorkspaceByDescriptor(ident) !== null;
  },
  addIdentToWorkspace(ident, workspace) {
    workspace.descriptors.push(ident);
  },
};

const locatorWorker: IdentWorker<Locator> = {
  isRegularWorkspace(ident, project) {
    return project.tryWorkspaceByLocator(ident) !== null;
  },
  addIdentToWorkspace(ident, workspace) {
    workspace.locators.push(ident);
  },
};

export class ExternalWorkspaceTracker {
  trace;
  report;
  root;

  private findPackage;
  private project;

  private workspaceMap = new Map<string, Workspace>();
  private workspaceByIdent = new Map<string, Workspace>();
  private notExternal = new Set<string>();

  private resolver: Resolver | null = null;
  private fetcher: Fetcher | null = null;

  constructor(settings: ExternalWorkspaces, project: Project) {
    this.findPackage = settings.findPackage;
    this.trace = settings.trace;
    this.report = settings.report;
    this.root = npath.toPortablePath(settings.root);
    this.project = project;
  }

  private tryIdentLookup(ident: Ident) {
    return this.workspaceByIdent.get(ident.identHash) || null;
  }

  private tryNameLookup(pkgName: string) {
    return this.workspaceMap.get(pkgName) || null;
  }

  private findTarget(localPath: string): WorkspaceTarget {
    if (localPath) {
      return localPath.endsWith(".tgz") ? "tgz" : "files";
    }
    return "fallback";
  }

  private createWorkspace(name: string, localPath: string): Workspace {
    return {
      name,
      target: this.findTarget(localPath),
      localPath: npath.toPortablePath(localPath),
      descriptors: [],
      locators: [],
    };
  }

  private tryIdent<T extends Ident>(ident: T, worker: IdentWorker<T>) {
    // try the quick lookup by ident hash
    let workspace = this.tryIdentLookup(ident);

    // exit early if this wasn't found but has been tried before
    if (!workspace && this.notExternal.has(ident.identHash)) {
      return null;
    }

    // if we didn't find it, and this is a new query try to do a deeper lookup
    if (!workspace) {
      // now switch to name resolution
      const pkgName = structUtils.stringifyIdent(ident);
      workspace = this.tryNameLookup(pkgName);

      // make sure this isn't a regular workspace, this allows a meta-project to return all external workspaces without
      // having to filter based on the caller
      if (!workspace && !worker.isRegularWorkspace(ident, this.project)) {
        // now call to the loaded external workspaces to resolve the package
        const pkgInfo = this.findPackage(pkgName);
        if (pkgInfo) {
          // create the workspace
          workspace = this.createWorkspace(pkgName, pkgInfo.path || "");
          this.trace(
            `Loaded external workspace ${pkgName} of type ${workspace.target}`
          );
          this.workspaceMap.set(pkgName, workspace);
        }
      }

      if (workspace) {
        // add the ident to the workspace, it is new otherwise the hash lookup would have found it
        worker.addIdentToWorkspace(ident, workspace);
        // add the workspace to the map of workspaces by ident hash
        this.workspaceByIdent.set(ident.identHash, workspace);
      }
    }
    return workspace;
  }

  /**
   * See if the descriptor references an external workspace, trying the cache first, before doing a real lookup
   * @param descriptor the descriptor to try to find
   * @returns a Workspace if this is an external workspace, or null
   */
  tryByDescriptor(descriptor: Descriptor) {
    return this.tryIdent(descriptor, descriptorWorker);
  }

  /**
   * See if the locator references an external workspace, trying the cache first, before doing a real lookup
   * @param locator the descriptor to try to find
   * @returns a Workspace if this is an external workspace, or null
   */
  tryByLocator(locator: Locator) {
    return this.tryIdent(locator, locatorWorker);
  }

  /**
   * @param descriptor the descriptor to ensure there is at least one locator for
   * @returns the locators for the workspace, or an empty array if there is no workspace
   */
  ensureLocators(descriptor: Descriptor): Locator[] {
    const workspace = this.tryByDescriptor(descriptor);
    if (workspace && !workspace.blockBinding) {
      if (workspace.locators.length === 0) {
        // if there are no locators, then add one
        const range = versionFromDescriptorRange(descriptor.range);
        const locator = structUtils.makeLocator(
          descriptor,
          encodeRange(workspace.name, range)
        );
        workspace.locators.push(locator);
      }
      return workspace.locators;
    }
    return [];
  }

  private getFallbackRange(workspace: Workspace): string {
    const ranges = workspace.descriptors.map(
      (descriptor) => decodeDescriptorRange(descriptor.range).version
    );
    let mostExclusive = ranges[0];
    let minVersion = semver.minVersion(mostExclusive);
    for (const range of ranges) {
      if (range === "*") {
        return "*";
      }
      if (semver.validRange(range)) {
        const newMinVersion = semver.minVersion(range);
        if (newMinVersion) {
          if (!minVersion || semver.gt(newMinVersion, minVersion)) {
            minVersion = newMinVersion;
            mostExclusive = range;
          }
        }
      }
    }
    return mostExclusive;
  }

  /**
   * Falls back to normal non-external resolution via an undecorated package name + version descriptor
   * @param name the package name, including scope
   * @param version the package version string
   * @param opts the fetch options
   */
  async fetchFallback(workspace: Workspace, opts: FetchOptions) {
    // Build a generic descriptor with name (@scope/pkg) and version to allow resolution to find the locator
    const descriptor = structUtils.makeDescriptor(
      structUtils.parseIdent(workspace.name),
      this.getFallbackRange(workspace)
    );

    // Resolve + Fetch using Yarn’s normal pipeline
    this.resolver ??= opts.project.configuration.makeResolver();
    this.fetcher ??= opts.project.configuration.makeFetcher();
    const resolveOptions: ResolveOptions = {
      project: opts.project,
      resolver: this.resolver,
      fetchOptions: opts,
      report: opts.report,
    };

    // Actually resolve the fallback descriptor (so it picks the correct version/tarball)
    workspace.blockBinding = true;
    const candidates = await this.resolver.getCandidates(
      descriptor,
      {},
      resolveOptions
    );
    if (candidates.length === 0) {
      throw new Error(
        `No candidate found on npm for "${workspace.name}" : "${descriptor.range}"`
      );
    }
    const locator = candidates[0];
    workspace.blockBinding = false;

    // Then fetch the fallback as if it was an npm package:
    this.trace(
      `Fetcher: falling back to generic fetch for ${workspace.name}: ${descriptor.range}`
    );
    return await this.fetcher.fetch(locator, opts);
  }
}

let workspaceTracker: ExternalWorkspaceTracker | null = null;

export function getWorkspaceTracker(
  project: Project
): ExternalWorkspaceTracker {
  if (!workspaceTracker) {
    const settings = getExternalWorkspaces(npath.fromPortablePath(project.cwd));
    workspaceTracker = new ExternalWorkspaceTracker(settings, project);
  }
  return workspaceTracker;
}
