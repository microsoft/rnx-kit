import {
  LinkType,
  Manifest,
  structUtils,
  type Descriptor,
  type Locator,
  type MinimalResolveOptions,
  type Package,
  type ResolveOptions,
  type Resolver,
} from "@yarnpkg/core";
import { getWorkspaceTracker, type ExternalWorkspaceTracker } from "./tracker";
import { getFallbackProtocol, getProtocol } from "./utilities";
import { type ResolverType } from "./workspace";

//const { stringifyIdent, makeDescriptor } = structUtils;
class ResolverBase implements Resolver {
  private resolverType: ResolverType;
  private protocol: string;
  private tracker: ExternalWorkspaceTracker | null = null;

  constructor(resolverType: ResolverType, protocol: string) {
    this.resolverType = resolverType;
    this.protocol = protocol;
  }

  /**
   * Ensure a finder is created if it is not already present, then return it
   */
  private ensureTracker(opts: MinimalResolveOptions) {
    if (!this.tracker) {
      this.tracker = getWorkspaceTracker(opts.project);
    }
    return this.tracker;
  }

  /**
   * Force resolution of a different package to happen before this package is resolved.
   */
  getResolutionDependencies(
    descriptor: Descriptor,
    opts: MinimalResolveOptions
  ): Record<string, Descriptor> {
    const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
    return workspace.getResolutionDependencies(descriptor, this.resolverType);
  }

  /**
   * Do we support these descriptors, in particular turning them into locators
   */
  supportsDescriptor(
    descriptor: Descriptor,
    _opts: MinimalResolveOptions
  ): boolean {
    return descriptor.range.startsWith(this.protocol);
  }

  /**
   * Do we support locators of this type, effectively will this resolve
   */
  supportsLocator(locator: Locator, _opts: MinimalResolveOptions): boolean {
    return locator.reference.startsWith(this.protocol);
  }

  /**
   * Persist resolution between installs, false for places where we will pick it up from local. If this
   * was true we would only fetch if a checksum of sorts changes.
   */
  shouldPersistResolution(
    _locator: Locator,
    _opts: MinimalResolveOptions
  ): boolean {
    return false;
  }

  /**
   * Chance to transform a descriptor to another type, has lockfile implications and actually removes this descriptor from
   * the resolution chain in the lockfile.
   */
  bindDescriptor(
    descriptor: Descriptor,
    _fromLocator: Locator,
    _opts: MinimalResolveOptions
  ): Descriptor {
    return descriptor;
  }

  /**
   * This is the driver for turning descriptors into locators, creating them if necessary. In npm resolution it will do
   * things like comparing semver ranges. Descriptors can have a semver range, where locators need to settle on a particular
   * resolution and be specific.
   */
  async getCandidates(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    opts: ResolveOptions
  ) {
    const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
    return await workspace.getCandidates(
      descriptor,
      dependencies,
      opts,
      this.resolverType
    );
  }

  /**
   * Given a set of locators, usually found via getCandidates, which ones satisfy this descriptor and which one
   * should be chosen. It returns an array but typically will select entry [0] as the best candidate, whether
   * sorted is set or not. This locator then feeds into resolve
   */
  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    locators: Locator[],
    opts: ResolveOptions
  ) {
    const workspace = this.ensureTracker(opts).findByDescriptor(descriptor);
    return await workspace.getSatisfying(
      descriptor,
      dependencies,
      locators,
      opts,
      this.resolverType
    );
  }

  /**
   * Build the full package for this locator, this is cached and used for install and also is used for
   * lockfile generation.
   */
  async resolve(locator: Locator, opts: ResolveOptions): Promise<Package> {
    const tracker = this.ensureTracker(opts);
    const errorMsg = `UNEXPECTED: resolve called for ${structUtils.stringifyLocator(
      locator
    )} in ${this.resolverType} resolver`;
    tracker.trace(errorMsg);
    throw new Error(errorMsg);
  }
}

export class FallbackResolver extends ResolverBase {
  static protocol = getFallbackProtocol();

  constructor() {
    super("remote", FallbackResolver.protocol);
  }
}

/**
 * The resolver implements the logic for the external: protocol.
 */
export class ExternalResolver extends ResolverBase {
  static protocol = getProtocol();

  constructor() {
    super("local", ExternalResolver.protocol);
  }

  /**
   * This function will, given a locator, return the full package definition
   * for the package pointed at. Note that this should only be called for packages which are
   * locally available, for remote ones they should fall through to a different resolver/fetcher.
   *
   * @param locator The source locator.
   * @param opts The resolution options.
   */
  override async resolve(locator: Locator, opts: ResolveOptions) {
    const emptyManifest = new Manifest();

    return {
      ...emptyManifest,
      ...locator,
      version: "0.0.0",
      languageName: opts.project.configuration.get("defaultLanguageName"),
      linkType: LinkType.SOFT,
    } as Package;
  }
}
