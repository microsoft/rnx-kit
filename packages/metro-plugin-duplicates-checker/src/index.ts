import type {
  Graph,
  MetroPlugin,
  Module,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";
import { readFile } from "fs";
import {
  checkForDuplicateDependencies,
  checkForDuplicatePackages,
  defaultOptions,
  Options,
} from "./checkForDuplicatePackages";
import type { MixedSourceMap } from "./SourceMap";

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
        const { throwOnError = true } = options;
        if (throwOnError) {
          reject(new Error("Duplicates found"));
        } else {
          console.error("❌ Duplicates found!");
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

      console.error("❌ Duplicates found!");
    }
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
