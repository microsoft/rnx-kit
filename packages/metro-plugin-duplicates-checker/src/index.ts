import { readFile } from "fs";
import {
  checkForDuplicatePackages,
  defaultOptions,
  Options,
} from "./checkForDuplicatePackages";
import type { MixedSourceMap, PostProcessBundleSourceMap } from "./SourceMap";

export { checkForDuplicatePackages };

export function checkForDuplicatePackagesInFile(
  sourceMap: string,
  options: Options = defaultOptions
): Promise<void> {
  return new Promise((resolve, reject) =>
    readFile(sourceMap, { encoding: "utf-8" }, (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      const sourceMap = JSON.parse(data) as MixedSourceMap;
      const count = checkForDuplicatePackages(sourceMap, options);
      if (count > 0) {
        reject(new Error("Duplicates found! ⚠️"));
      } else {
        resolve();
      }
    })
  );
}

/**
 * Intended to be used as a Metro bundle source map
 * [post-processor](https://github.com/facebook/metro/blob/601f6cd133004e26a293272f711808219c88e508/docs/Configuration.md#postprocessbundlesourcemap)
 * but the hook was removed in
 * [0.56](https://github.com/facebook/metro/commit/cd67cd47941a942509a360bac3d8a11c5ce070ff#diff-660c08c7ccb569e12d8a268bd8fa2011?w=1)
 * for some reason.
 *
 * Usage:
 *
 *     // metro.config.js
 *     {
 *       projectRoot: __dirname,
 *       serializer: {
 *         postProcessBundleSourcemap: DuplicatesPlugin({
 *           ignoredModules: [],
 *           bannedModules: [],
 *         }),
 *       },
 *     }
 *
 * @see https://github.com/facebook/metro/pull/608
 */
export function DuplicatesPlugin(
  options: Options = defaultOptions
): (bundleSourceMap: PostProcessBundleSourceMap) => PostProcessBundleSourceMap {
  return (bundleSourceMap: PostProcessBundleSourceMap) => {
    const { map } = bundleSourceMap;
    checkForDuplicatePackages(map, options);
    return bundleSourceMap;
  };
}

if (require.main === module) {
  checkForDuplicatePackagesInFile(process.argv[2]).catch((error) => {
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
  });
}
