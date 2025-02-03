import {
  Descriptor,
  LinkType,
  Locator,
  Manifest,
  MinimalResolveOptions,
  Package,
  ResolveOptions,
  Resolver,
  structUtils,
} from "@yarnpkg/core";
import { stringifyIdent } from "@yarnpkg/core/lib/structUtils";
import { CONFIG_DEFAULT, CONFIG_KEY, RANGE_PROTOCOL } from "./constants";
import { loadConfigFile } from "./finder";
import { DefinitionFinder } from "./types";

/**
 * The resolver implements the logic for the external: protocol.
 */
export class ExternalResolver implements Resolver {
  private finder: DefinitionFinder | undefined = undefined;

  private getFinder(opts: MinimalResolveOptions) {
    if (!this.finder) {
      let configPath = opts.project.configuration.get(CONFIG_KEY) as string;
      if (!configPath || typeof configPath !== "string") {
        configPath = CONFIG_DEFAULT;
      }
      this.finder = loadConfigFile(configPath);
    }
    return this.finder;
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
    _opts: MinimalResolveOptions
  ): boolean {
    return descriptor.range.startsWith(RANGE_PROTOCOL);
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
    return locator.reference.startsWith(RANGE_PROTOCOL);
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
    // Usually false for protocols that transform themselves to something else
    return false;
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
   * In this case the descriptor is being transformed away from the external: protocol
   * to either portal: or npm: depending on whether the package is local or not
   *
   * @param descriptor The depended descriptor.
   * @param fromLocator The dependent locator.
   * @param opts The resolution options.
   */
  bindDescriptor(
    descriptor: Descriptor,
    fromLocator: Locator,
    opts: MinimalResolveOptions
  ): Descriptor {
    const finder = this.getFinder(opts);

    // look up the package information from the finder
    const pkgName = stringifyIdent(descriptor);
    const info = finder(pkgName);

    if (!info) {
      throw Error(
        `Unknown external workspace "${pkgName}:${RANGE_PROTOCOL}" included by "${stringifyIdent(fromLocator)}"`
      );
    }

    if (info.path) {
      // If the package is local, we want to return a descriptor that will
      // be transformed into a locator by the portal: protocol.
      // This is what Yarn's own workspace resolver does.
      return structUtils.makeDescriptor(descriptor, `portal:${info.path}`);
    } else {
      // If the package is not local, we want to return a descriptor that
      // will be transformed into a locator by the npm semver fallback.
      return structUtils.makeDescriptor(descriptor, info.version);
    }
  }

  /**
   * This function will, given a descriptor, return the list of locators that
   * potentially satisfy it.
   *
   * The returned array must be sorted in such a way that the preferred
   * locators are first. This will cause the resolution algorithm to prioritize
   * them if possible (it doesn't guarantee that they'll end up being used).
   *
   * Note that because this protocol is routing to either portal or npm server this
   * should not be called but this is the minimum technically correct implementation
   *
   * @param descriptor The source descriptor.
   * @param dependencies The resolution dependencies and their resolutions.
   * @param opts The resolution options.
   */
  async getCandidates(
    descriptor: Descriptor,
    _dependencies: Record<string, Package>,
    _opts: ResolveOptions
  ) {
    return [structUtils.makeLocator(descriptor, descriptor.range)];
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
    locators: Array<Locator>,
    opts: ResolveOptions
  ) {
    const [locator] = await this.getCandidates(descriptor, dependencies, opts);

    return {
      locators: locators.filter(
        (candidate) => candidate.locatorHash === locator.locatorHash
      ),
      sorted: false,
    };
  }

  /**
   * This function will, given a locator, return the full package definition
   * for the package pointed at. This shouldn't be called for a transforming protocol
   *
   * @param locator The source locator.
   * @param opts The resolution options.
   */
  async resolve(locator: Locator, _opts: ResolveOptions) {
    // For a purely transforming protocol, you can just return an empty Manifest
    const manifest = new Manifest();
    return {
      ...locator,
      ...manifest,
      name: locator.name,
      version: "0.0.0",
      languageName: "unknown",
      linkType: LinkType.SOFT,
      conditions: null,
    } as Package;
  }
}
