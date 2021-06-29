import { error } from "@rnx-kit/console";
import type { MetroPlugin } from "@rnx-kit/metro-serializer";
import { readFile } from "fs";
import type { Graph, Module, SerializerOptions } from "metro";
import type { MixedSourceMap } from "metro-source-map";
import {
  checkForDuplicateDependencies,
  checkForDuplicatePackages,
  defaultOptions,
  Options,
} from "./checkForDuplicatePackages";

export { checkForDuplicatePackages };

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
      const count = checkForDuplicatePackages(sourceMap, options);
      if (count > 0) {
        const { throwOnError = true } = options;
        if (throwOnError) {
          reject(new Error("Duplicates found"));
        } else {
          error("Duplicates found!");
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
  return (
    _entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    graph: Graph,
    _options: SerializerOptions
  ) => {
    const count = checkForDuplicateDependencies(graph, pluginOptions);
    if (count > 0) {
      const { throwOnError = true } = pluginOptions;
      if (throwOnError) {
        throw new Error("Duplicates found");
      }

      error("Duplicates found!");
    }
  };
}

if (require.main === module) {
  checkForDuplicatePackagesInFile(process.argv[2]).catch((error) => {
    if (error) {
      error(error.message);
      process.exit(1);
    }
  });
}
