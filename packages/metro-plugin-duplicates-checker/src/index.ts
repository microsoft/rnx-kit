import { error } from "@rnx-kit/console";
import type { DuplicateDetectorOptions as Options } from "@rnx-kit/core-types";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import type { MixedSourceMap } from "metro-source-map";
import { readFile } from "node:fs";
import type { Result } from "./checkForDuplicatePackages.ts";
import {
  checkForDuplicateDependencies,
  checkForDuplicatePackages,
  defaultOptions,
} from "./checkForDuplicatePackages.ts";

export type { DuplicateDetectorOptions as Options } from "@rnx-kit/core-types";
export { detectDuplicatePackages } from "./checkForDuplicatePackages.ts";
export type { Result } from "./checkForDuplicatePackages.ts";
export { normalizePath, resolveModule } from "./gatherModules.ts";
export { checkForDuplicatePackages };

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
