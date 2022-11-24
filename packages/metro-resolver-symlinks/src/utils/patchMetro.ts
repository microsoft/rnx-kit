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
      `Cannot find '${modulePath}'. This probably means that 'experimental_retryResolvingFromDisk' is not compatible with the version of 'metro' that you are currently using. Please update to the latest version and try again. If the issue still persists after the update, please file a bug at https://github.com/microsoft/rnx-kit/issues.`
    );
  }
}

function getDependencyGraph() {
  return importMetroModule("/src/node-haste/DependencyGraph");
}

function getModuleResolver() {
  return importMetroModule("/src/node-haste/DependencyGraph/ModuleResolution");
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
export function patchMetro({
  experimental_retryResolvingFromDisk,
}: Options): void {
  if (!experimental_retryResolvingFromDisk) {
    return;
  }

  const DependencyGraph = getDependencyGraph();
  const { ModuleResolver } = getModuleResolver();

  // Patch `_createModuleResolver` and `_doesFileExist` to use `fs.existsSync`.
  DependencyGraph.prototype.orig__createModuleResolver =
    DependencyGraph.prototype._createModuleResolver;
  DependencyGraph.prototype._createModuleResolver = function (): void {
    this._doesFileExist = (filePath: string): boolean => {
      return this._hasteFS.exists(filePath) || fileExists(filePath);
    };

    this._moduleResolver = new ModuleResolver({
      dirExists: (filePath: string) => {
        try {
          return fs.lstatSync(filePath).isDirectory();
        } catch (_) {
          return false;
        }
      },
      disableHierarchicalLookup:
        this._config.resolver.disableHierarchicalLookup,
      doesFileExist: this._doesFileExist,
      emptyModulePath: this._config.resolver.emptyModulePath,
      extraNodeModules: this._config.resolver.extraNodeModules,
      isAssetFile: (file: string) =>
        this._assetExtensions.has(path.extname(file)),
      mainFields: this._config.resolver.resolverMainFields,
      moduleCache: this._moduleCache,
      moduleMap: this._moduleMap,
      nodeModulesPaths: this._config.resolver.nodeModulesPaths,
      preferNativePlatform: true,
      projectRoot: this._config.projectRoot,
      resolveAsset: (dirPath: string, assetName: string, extension: string) => {
        const basePath = dirPath + path.sep + assetName;
        const assets = [
          basePath + extension,
          ...this._config.resolver.assetResolutions.map(
            (resolution: string) =>
              basePath + "@" + resolution + "x" + extension
          ),
        ].filter(this._doesFileExist);
        return assets.length ? assets : null;
      },
      resolveRequest: this._config.resolver.resolveRequest,
      sourceExts: this._config.resolver.sourceExts,
    });
  };

  // Since we will be resolving files outside of `watchFolders`, their hashes
  // will not be found. We'll return the `filePath` as they should be unique.
  DependencyGraph.prototype.orig_getSha1 = DependencyGraph.prototype.getSha1;
  DependencyGraph.prototype.getSha1 = function (filePath: string): string {
    try {
      return this.orig_getSha1(filePath);
    } catch (e) {
      if (e instanceof ReferenceError) {
        return filePath;
      }

      throw e;
    }
  };
}
