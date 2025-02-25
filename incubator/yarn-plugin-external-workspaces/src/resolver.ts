import type {
  Descriptor,
  Locator,
  MinimalResolveOptions,
  Package,
  ResolveOptions,
  Resolver,
} from "@yarnpkg/core";
import { LinkType, Manifest, miscUtils, structUtils } from "@yarnpkg/core";
import { type ExternalWorkspaceTracker, getWorkspaceTracker } from "./tracker";
import { decodeDescriptorRange, encodeRange, getProtocol } from "./utilities";

const { stringifyIdent, makeDescriptor } = structUtils;

/**
 * The resolver implements the logic for the external: protocol.
 */
export class ExternalResolver implements Resolver {
  static protocol = getProtocol();
  private tracker: ExternalWorkspaceTracker | null = null;

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
   * This function must return a set of other descriptors that must be
   * transformed into locators before the subject descriptor can be transformed
   * into a locator. This is typically only needed for transform packages, as
   * you need to know the original resolution in order to copy it.
   */
  getResolutionDependencies(
    _descriptor: Descriptor,
    _opts: MinimalResolveOptions
  ): Record<string, Descriptor> {
    return {};
  }
  /**
   * This function must return true if the specified descriptor is meant to be
   * turned into a locator by this resolver. The other functions (except its
   * locator counterpart) won't be called if it returns false.
   *
   * @param descriptor The descriptor that needs to be validated.
   * @param opts The resolution options.
   */
  supportsDescriptor(
    descriptor: Descriptor,
    opts: MinimalResolveOptions
  ): boolean {
    const tracker = this.ensureTracker(opts);
    if (descriptor.range.startsWith(ExternalResolver.protocol)) {
      return true;
    }

    if (tracker.tryByDescriptor(descriptor)) {
      return true;
    }

    return false;
  }

  /**
   * This function must return true if the specified locator is meant to be
   * turned into a package definition by this resolver. The other functions
   * (except its locator counterpart) won't be called if it returns false.
   *
   * @param locator The locator that needs to be validated.
   * @param opts The resolution options.
   */
  supportsLocator(locator: Locator, _opts: MinimalResolveOptions): boolean {
    return locator.reference.startsWith(ExternalResolver.protocol);
  }

  /**
   * This function indicates whether the package definition for the specified
   * locator must be kept between installs. You typically want to return true
   * for all packages that are cached, but return false for all packages that
   * hydrate packages directly from the filesystem (for example workspaces).
   *
   * Note that even packages returning false are stored within the lockfile!
   * The difference is that when a new install is done, all package definitions
   * that return false will be discarded and resolved again (their potential
   * cache data will be kept, though).
   *
   * @param locator The queried package.
   * @param opts The resolution options.
   */
  shouldPersistResolution(
    _locator: Locator,
    _opts: MinimalResolveOptions
  ): boolean {
    return true;
  }

  /**
   * This function is called for each dependency present in the dependency list
   * of a package definition. If it returns a new descriptor, this new
   * descriptor will be used
   *
   * Note that `fromLocator` is not necessarily a locator that's supported by
   * the resolver. It simply is the locator of the package that depends on the
   * specified descriptor, regardless who owns it.
   *
   * The binding happening here injects the package name into the range provided in the resolutions
   * such that the resolution:
   * - "package-name" : "external:^1.2.3" ==> "external:package-name@^1.2.3"
   *
   * @param descriptor The depended descriptor.
   * @param fromLocator The dependent locator.
   * @param opts The resolution options.
   */
  bindDescriptor(
    descriptor: Descriptor,
    _fromLocator: Locator,
    opts: MinimalResolveOptions
  ): Descriptor {
    // see if this is really an external workspace despite missing the protocol
    if (!descriptor.range.startsWith(ExternalResolver.protocol)) {
      const tracker = this.ensureTracker(opts);
      const workspace = tracker.tryByDescriptor(descriptor);
      if (workspace && !workspace.blockBinding) {
        // in this case rebind the descriptor with the protocol
        const { version } = decodeDescriptorRange(descriptor.range);
        const newRange = encodeRange(stringifyIdent(descriptor), version);
        tracker.trace(
          `Rebinding @${descriptor.scope}/${descriptor.name} to ${newRange}`
        );
        return makeDescriptor(descriptor, newRange);
      }
    }
    return descriptor;
  }

  /**
   * This function will, given a descriptor, return the list of locators that
   * potentially satisfy it.
   *
   * This transforms the descriptor into an equivalent locator in the case a match isn't found
   *
   * @param descriptor The source descriptor.
   * @param dependencies The resolution dependencies and their resolutions.
   * @param opts The resolution options.
   */
  async getCandidates(
    descriptor: Descriptor,
    _dependencies: Record<string, Package>,
    opts: ResolveOptions
  ) {
    return this.ensureTracker(opts).ensureLocators(descriptor);
  }

  /**
   * This function will, given a descriptor and a list of locators,
   * find out which of the locators potentially satisfy the descriptor.
   *
   * This function is different from `getCandidates`, as `getCandidates` will
   * resolve the descriptor into a list of locators (potentially using the network),
   * while `getSatisfying` will statically compute which known references potentially
   * satisfy the target descriptor.
   *
   * Note that the parameter references aren't guaranteed to be supported by
   * the resolver, so they'll probably need to be filtered beforehand.
   *
   * The returned array should be sorted in such a way that the preferred
   * locators are first. This will cause the resolution algorithm to prioritize
   * them if possible (it doesn't guarantee that they'll end up being used). If
   * the resolver is unable to provide a definite order (for example like the
   * `file:` protocol resolver, where ordering references would make no sense),
   * the `sorted` field should be set to `false`.
   *
   * @param descriptor The target descriptor.
   * @param dependencies The resolution dependencies and their resolutions.
   * @param locators The candidate locators.
   * @param opts The resolution options.
   */
  async getSatisfying(
    descriptor: Descriptor,
    dependencies: Record<string, Package>,
    _locators: Locator[],
    opts: ResolveOptions
  ) {
    const satisfying = await this.getCandidates(descriptor, dependencies, opts);
    return {
      locators: satisfying,
      sorted: false,
    };
  }

  /**
   * This function will, given a locator, return the full package definition
   * for the package pointed at. Note that this should only be called for packages which are
   * locally available, for remote ones they should fall through to a different resolver/fetcher.
   *
   * @param locator The source locator.
   * @param opts The resolution options.
   */
  async resolve(locator: Locator, opts: ResolveOptions) {
    const tracker = this.ensureTracker(opts);
    if (!opts.fetchOptions) {
      throw new Error(
        `Assertion failed: This resolver cannot be used unless a fetcher is configured`
      );
    }

    tracker.trace(`Resolving ${stringifyIdent(locator)}`);
    const packageFetch = await opts.fetchOptions.fetcher.fetch(
      locator,
      opts.fetchOptions
    );

    const manifest = await miscUtils.releaseAfterUseAsync(async () => {
      return await Manifest.find(packageFetch.prefixPath, {
        baseFs: packageFetch.packageFs,
      });
    }, packageFetch.releaseFs);

    return {
      ...locator,

      version: manifest.version || `0.0.0`,

      languageName:
        manifest.languageName ||
        opts.project.configuration.get(`defaultLanguageName`),
      linkType: LinkType.SOFT,

      conditions: manifest.getConditions(),

      dependencies: opts.project.configuration.normalizeDependencyMap(
        manifest.dependencies
      ),
      peerDependencies: manifest.peerDependencies,

      dependenciesMeta: manifest.dependenciesMeta,
      peerDependenciesMeta: manifest.peerDependenciesMeta,

      bin: manifest.bin,
    };
  }
}
