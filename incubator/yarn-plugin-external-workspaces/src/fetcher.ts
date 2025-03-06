import {
  type Fetcher,
  type FetchOptions,
  type FetchResult,
  type Locator,
} from "@yarnpkg/core";
import { CwdFS, PortablePath, ppath } from "@yarnpkg/fslib";
import { getWorkspaceTracker, type ExternalWorkspaceTracker } from "./tracker";
import { getProtocol } from "./utilities";
import { type ExternalWorkspace } from "./workspace";

/**
 * The "fetcher" is where we decide if the local path is present or not.
 * If present => link it. If absent => fetch from npm. Critically, we do
 * NOT rewrite the lockfile. We always keep the same "external:..." reference.
 */
export class ExternalFetcher implements Fetcher {
  static protocol = getProtocol();
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
  getLocalPath(locator: Locator, opts: FetchOptions): PortablePath | null {
    const workspace = this.ensureTracker(opts).findByLocator(locator);
    if (workspace.localPath) {
      return workspace.localPath;
    }
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
    const tracker = this.ensureTracker(opts);
    const workspace = tracker.findByLocator(locator);

    const fallbackResults = await this.fetchFallback(locator, opts, workspace);

    if (workspace.localPath) {
      const localPath = ppath.resolve(tracker.root, workspace.localPath);
      const { checksum } = fallbackResults;
      if (!checksum) {
        tracker.trace(
          `Fetcher: failed to find checksum for ${workspace.prettyName}`
        );
      }

      const parentFetch: FetchResult = {
        packageFs: new CwdFS(PortablePath.root),
        prefixPath: localPath,
        localPath: localPath,
        checksum,
      };
      return parentFetch;
    }

    // otherwise fallthrough to resolving the package + version combination
    return fallbackResults;
  }

  private async fetchFallback(
    locator: Locator,
    opts: FetchOptions,
    workspace: ExternalWorkspace
  ) {
    const fallbackLocator = workspace.toFallbackLocator(locator);
    const fetcher = opts.fetcher;
    return await fetcher.fetch(fallbackLocator, opts);
  }
}
