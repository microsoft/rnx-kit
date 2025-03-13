import { type Fetcher, type FetchOptions, type Locator } from "@yarnpkg/core";
import { CwdFS, PortablePath, ppath } from "@yarnpkg/fslib";
import { getWorkspaceTracker, type ExternalWorkspaceTracker } from "./tracker";
import { LOCAL_PROTOCOL, type ExternalWorkspace } from "./workspace";

/**
 * The "fetcher" is where we decide if the local path is present or not.
 * If present => link it. If absent => fetch from npm. Critically, we do
 * NOT rewrite the lockfile. We always keep the same "external:..." reference.
 */
export class ExternalWorkspaceFetcher implements Fetcher {
  static protocol = LOCAL_PROTOCOL;
  private tracker: ExternalWorkspaceTracker | null = null;

  private ensureTracker(opts: FetchOptions) {
    if (!this.tracker) {
      this.tracker = getWorkspaceTracker(opts.project);
    }
    return this.tracker;
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
    return locator.reference.startsWith(ExternalWorkspaceFetcher.protocol);
  }

  /**
   * This function must return the local path for the given package. The local
   * path is the one that's used to resolve relative dependency sources, for
   * example "file:./foo".
   *
   * @param locator The source locator.
   * @param opts The fetch options.
   */
  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
    const workspace = this.ensureTracker(opts).findByLocator(locator);
    return workspace.localPath || null;
  }

  /**
   * Fetch results for locally existing packages. This is a LinkType.SOFT fetcher, though we do
   * fall through and return the hard link style results from the fallback fetcher. This is OK as
   * those results won't be installed.
   *
   * @param locator The source locator.
   * @param opts The fetch options.
   */
  async fetch(locator: Locator, opts: FetchOptions) {
    const tracker = this.ensureTracker(opts);
    const workspace = tracker.findByLocator(locator);

    if (workspace.localPath) {
      const localPath = ppath.resolve(tracker.root, workspace.localPath);

      return {
        packageFs: new CwdFS(PortablePath.root),
        prefixPath: localPath,
        localPath: localPath,
      };
    }

    // otherwise fallthrough to resolving the package + version combination
    return await this.fetchFallback(locator, opts, workspace);
  }

  /**
   * Return fetch results from the fallback fetcher. This is likely the npm: fetcher but could potentially be
   * any hardlink based fetcher, though implementing that may require not offloading the locator/candidate chaining.
   *
   * Trim checksum value so it isn't recorded in the lockfile for the external protocol entry
   *
   * @param locator source locator for this fetch operation
   * @param opts fetch options
   * @param workspace loaded workspace for this locator
   * @returns results from the fallback fetcher, likely the npm: fetcher
   */
  private async fetchFallback(
    locator: Locator,
    opts: FetchOptions,
    workspace: ExternalWorkspace
  ) {
    const fallbackLocator = workspace.toFallbackLocator(locator);
    const fetcher = opts.fetcher;

    const results = await fetcher.fetch(fallbackLocator, opts);
    delete results.checksum;
    return results;
  }
}
