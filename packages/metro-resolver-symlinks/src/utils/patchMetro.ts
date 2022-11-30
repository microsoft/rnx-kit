import * as fs from "fs";
import * as path from "path";
import { ensureResolveFrom, getMetroSearchPath } from "../helper";
import type { Options } from "../types";

function fileExists(path: string): boolean {
  const stat = fs.statSync(path, { throwIfNoEntry: false });
  return Boolean(stat && stat.isFile());
}

function importMetroModule(path: string) {
  const metroPath = ensureResolveFrom("metro", getMetroSearchPath());
  const modulePath = metroPath + path;
  try {
    return require(modulePath);
  } catch (_) {
    throw new Error(
      `Cannot find '${modulePath}'. This probably means that ` +
        "'experimental_retryResolvingFromDisk' is not compatible with the " +
        "version of 'metro' that you are currently using. Please update to " +
        "the latest version and try again. If the issue still persists after " +
        "the update, please file a bug at " +
        "https://github.com/microsoft/rnx-kit/issues."
    );
  }
}

function getDependencyGraph() {
  return importMetroModule("/src/node-haste/DependencyGraph");
}

function supportsRetryResolvingFromDisk(): boolean {
  const { version } = importMetroModule("/package.json");
  const [major, minor] = version.split(".");
  const v = major * 1000 + minor;
  return v >= 64 && v <= 73;
}

export function shouldEnableRetryResolvingFromDisk({
  experimental_retryResolvingFromDisk,
}: Options): boolean {
  if (
    !supportsRetryResolvingFromDisk() &&
    experimental_retryResolvingFromDisk !== "force"
  ) {
    console.warn(
      "The version of Metro you're using has not been tested with " +
        "`experimental_retryResolvingFromDisk`. If you still want to enable " +
        "it, please set it to 'force'."
    );
    return false;
  }

  return Boolean(experimental_retryResolvingFromDisk);
}

/**
 * Monkey-patches Metro to not use HasteFS as the only source for module
 * resolution.
 *
 * Practically every file system operation in Metro must go through HasteFS,
 * most notably watching for file changes and resolving node modules. If Metro
 * cannot find a file in the Haste map, it does not exist. This means that for
 * Metro to find a file, all folders must be declared in `watchFolders`,
 * including `node_modules` and any dependency storage folders (e.g. pnpm)
 * regardless of whether we need to watch them. In big monorepos, this can
 * easily overwhelm file watchers, even with Watchman installed.
 *
 * There's no way to avoid the initial crawling of the file system. However, we
 * can drastically reduce the number of files that needs to be crawled/watched
 * by not relying solely on Haste for module resolution. This requires patching
 * Metro to use `fs.existsSync` instead of `HasteFS.exists`. With this change,
 * we can list only the folders that we care about in `watchFolders`. In some
 * cases, like on CI, we can even set `watchFolders` to an empty array to limit
 * watched files to the current package only.
 *
 * Why didn't we use `hasteImplModulePath`? Contrary to the name, it doesn't
 * let you replace HasteFS. As of 0.73, it is only used to retrieve the path of
 * a module. The default implementation returns
 * `path.relative(projectRoot, filePath)` if the entry is not found in the map.
 *
 * @param options Options passed to Metro
 */
export function patchMetro(options: Options): void {
  if (!shouldEnableRetryResolvingFromDisk(options)) {
    return;
  }

  const DependencyGraph = getDependencyGraph();

  // Patch `_createModuleResolver` and `_doesFileExist` to use `fs.existsSync`.
  DependencyGraph.prototype.orig__createModuleResolver =
    DependencyGraph.prototype._createModuleResolver;
  DependencyGraph.prototype._createModuleResolver = function (): void {
    this._doesFileExist = (filePath: string): boolean => {
      return this._hasteFS.exists(filePath) || fileExists(filePath);
    };

    this.orig__createModuleResolver();
    if (typeof this._moduleResolver._options.resolveAsset !== "function") {
      throw new Error("Could not find `resolveAsset` in `ModuleResolver`");
    }

    this._moduleResolver._options.resolveAsset = (
      dirPath: string,
      assetName: string,
      extension: string
    ) => {
      const basePath = dirPath + path.sep + assetName;
      const assets = [
        basePath + extension,
        ...this._config.resolver.assetResolutions.map(
          (resolution: string) => basePath + "@" + resolution + "x" + extension
        ),
      ].filter(this._doesFileExist);
      return assets.length ? assets : null;
    };
  };

  // Since we will be resolving files outside of `watchFolders`, their hashes
  // will not be found. We'll return the `filePath` as they should be unique.
  DependencyGraph.prototype.orig_getSha1 = DependencyGraph.prototype.getSha1;
  DependencyGraph.prototype.getSha1 = function (filePath: string): string {
    try {
      return this.orig_getSha1(filePath);
    } catch (e) {
      // `ReferenceError` will always be thrown when Metro encounters a file
      // that does not exist in the Haste map.
      if (e instanceof ReferenceError) {
        return filePath;
      }

      throw e;
    }
  };
}
