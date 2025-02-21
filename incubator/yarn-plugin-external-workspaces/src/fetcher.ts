import { type ExternalWorkspaces } from "@rnx-kit/tools-workspaces/external";
import {
  type Fetcher,
  type FetchOptions,
  type FetchResult,
  type Locator,
  type ResolveOptions,
  type Resolver,
  structUtils,
} from "@yarnpkg/core";
import { CwdFS, npath, PortablePath } from "@yarnpkg/fslib";
import { decodeRange, getProtocol, getSettingsForProject } from "./utilities";

/**
 * The "fetcher" is where we decide if the local path is present or not.
 * If present => link it. If absent => fetch from npm. Critically, we do
 * NOT rewrite the lockfile. We always keep the same "external:..." reference.
 */
export class ExternalFetcher implements Fetcher {
  static protocol = getProtocol();
  private settings: ExternalWorkspaces | null = null;
  private fetcher: Fetcher | null = null;
  private resolver: Resolver | null = null;
  private resolveOptions: ResolveOptions | null = null;

  private ensureSettings(opts: FetchOptions) {
    if (!this.settings) {
      this.settings = getSettingsForProject(opts.project);
    }
    return this.settings;
  }

  /**
   * This function must return true if the specified locator is understood by
   * this resolver (only its syntax is checked, it doesn't have to be valid
   * and it's fine if the `fetch` ends up returning a 404).
   *
   * @param locator The locator that needs to be validated.
   * @param opts The fetch options.
   */
  supports(locator: Locator, _opts: FetchOptions): boolean {
    return locator.reference.startsWith(ExternalFetcher.protocol);
  }

  /**
   * This function must return the local path for the given package. The local
   * path is the one that's used to resolve relative dependency sources, for
   * example "file:./foo".
   *
   * @param locator The source locator.
   * @param opts The fetch options.
   */
  getLocalPath(_locator: Locator, _opts: FetchOptions): null {
    // Return null so Yarn will not treat it as a pure local fetch.
    return null;
  }

  /**
   * This function must return a object describing where the package manager
   * can find the data for the specified package on disk.
   *
   * The return value is a more complex than a regular path (cf FetchResult)
   * because the fetchers are allowed to return virtual paths that point to
   * things that don't actually exist (for example directories stored within
   * zip archives).
   *
   * @param locator The source locator.
   * @param opts The fetch options.
   */
  async fetch(locator: Locator, opts: FetchOptions) {
    const { name, version } = decodeRange(locator.reference);
    const { findPackage, trace } = this.ensureSettings(opts);
    const localPath = npath.toPortablePath(findPackage(name)?.path || "");

    if (localPath) {
      trace(`Found existing local path for ${name}: ${localPath}`);
      const result: FetchResult = {
        packageFs: new CwdFS(localPath),
        prefixPath: PortablePath.dot,
        localPath: localPath,
      };
      return result;
    }

    // otherwise fallthrough to resolving the package + version combination
    return await this.fetchFallback(name, version, opts);
  }

  /**
   * Falls back to normal non-external resolution via an undecorated package name + version descriptor
   * @param name the package name, including scope
   * @param version the package version string
   * @param opts the fetch options
   */
  private async fetchFallback(
    name: string,
    version: string,
    opts: FetchOptions
  ) {
    // Build a generic descriptor with name (@scope/pkg) and version to allow resolution to find the locator
    const descriptor = structUtils.makeDescriptor(
      structUtils.parseIdent(name),
      version
    );

    // Resolve + Fetch using Yarn’s normal pipeline
    this.resolver ??= opts.project.configuration.makeResolver();
    this.fetcher ??= opts.project.configuration.makeFetcher();
    this.resolveOptions ??= {
      project: opts.project,
      resolver: this.resolver,
      fetchOptions: opts,
      report: opts.report,
    };

    // Actually resolve the fallback descriptor (so it picks the correct version/tarball)
    const candidates = await this.resolver.getCandidates(
      descriptor,
      {},
      this.resolveOptions
    );
    if (candidates.length === 0) {
      throw new Error(`No candidate found on npm for "${name}" : "${version}"`);
    }
    const locator = candidates[0];
    // Then fetch the fallback as if it was an npm package:
    return await this.fetcher.fetch(locator, opts);
  }
}
