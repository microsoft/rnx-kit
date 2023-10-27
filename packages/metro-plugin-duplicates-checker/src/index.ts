import { error } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { readFile } from "fs";
import type { MixedSourceMap } from "metro-source-map";
import type { Options, Result } from "./checkForDuplicatePackages";
import {
  checkForDuplicateDependencies,
  checkForDuplicatePackages,
  defaultOptions,
} from "./checkForDuplicatePackages";

export { detectDuplicatePackages } from "./checkForDuplicatePackages";
export { normalizePath, resolveModule } from "./gatherModules";
export { checkForDuplicatePackages };
export type { Options, Result };

export function getErrorMessage({
  banned,
  duplicates,
}: Result): string | undefined {
  if (duplicates > 0) {
    if (banned > 0) {
      return `Found ${banned} banned module(s) and ${duplicates} duplicate(s)`;
    }
    return `Found ${duplicates} duplicate(s)`;
  }

  if (banned > 0) {
    return `Found ${banned} banned module(s)`;
  }

  return undefined;
}

export function checkForDuplicatePackagesInFile(
  sourceMap: string,
  options: Options = defaultOptions
): Promise<void> {
  return new Promise((resolve, reject) =>
    readFile(sourceMap, { encoding: "utf-8" }, (e, data) => {
      if (e) {
        reject(e);
        return;
      }

      const sourceMap = JSON.parse(data) as MixedSourceMap;
      const result = checkForDuplicatePackages(sourceMap, options);
      const errorMessage = getErrorMessage(result);
      if (errorMessage) {
        const { throwOnError = true } = options;
        if (throwOnError) {
          reject(new Error(errorMessage));
        } else {
          error(errorMessage);
          resolve();
        }
      } else {
        resolve();
      }
    })
  );
}

export function DuplicateDependencies(
  pluginOptions: Options = defaultOptions
): MetroPlugin {
  return (_entryPoint, _preModules, graph, _options) => {
    const result = checkForDuplicateDependencies(graph, pluginOptions);
    const errorMessage = getErrorMessage(result);
    if (errorMessage) {
      const { throwOnError = true } = pluginOptions;
      if (throwOnError) {
        throw new Error(errorMessage);
      }

      error(errorMessage);
    }
  };
}

DuplicateDependencies.type = "serializer";

if (require.main === module) {
  checkForDuplicatePackagesInFile(process.argv[2]).catch((error) => {
    if (error) {
      process.exitCode = 1;
      error(error.message);
    }
  });
}

// `export default` required for plugin interface
// eslint-disable-next-line no-restricted-exports
export default DuplicateDependencies;
