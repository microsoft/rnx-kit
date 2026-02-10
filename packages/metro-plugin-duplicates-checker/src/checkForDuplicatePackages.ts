import { error, warn } from "@rnx-kit/console";
import type { DuplicateDetectorOptions as Options } from "@rnx-kit/core-types";
import type { ReadOnlyGraph } from "metro";
import type { MixedSourceMap } from "metro-source-map";
import * as nodefs from "node:fs";
import type { ModuleMap } from "./gatherModules.ts";
import {
  gatherModulesFromGraph,
  gatherModulesFromSourceMap,
} from "./gatherModules.ts";

export type Result = {
  banned: number;
  duplicates: number;
};

export const defaultOptions: Options = {
  ignoredModules: [],
  bannedModules: [],
  throwOnError: true,
};

export function countCopies(module: ModuleMap[string]): number {
  return Object.keys(module).reduce((count, version) => {
    return count + module[version].size;
  }, 0);
}

export function printModule(module: ModuleMap[string]): void {
  for (const version of Object.keys(module).sort()) {
    for (const p of Array.from(module[version]).sort()) {
      warn(`  ${version} ${p}`);
    }
  }
}

export function detectDuplicatePackages(
  bundledModules: ModuleMap,
  { ignoredModules = [], bannedModules = [] }: Options
): Result {
  let numBanned = 0;
  let numDupes = 0;

  for (const name of Object.keys(bundledModules)) {
    if (bannedModules.includes(name)) {
      error(`${name} (banned)`);
      printModule(bundledModules[name]);
      numBanned += 1;
      continue;
    }

    if (ignoredModules.includes(name)) {
      continue;
    }

    const currentModule = bundledModules[name];
    const numCopies = countCopies(currentModule);
    if (numCopies > 1) {
      error(`${name} (found ${numCopies} copies)`);
      printModule(currentModule);
      numDupes += 1;
      continue;
    }
  }

  return { banned: numBanned, duplicates: numDupes };
}

export function checkForDuplicateDependencies(
  graph: ReadOnlyGraph,
  options: Options = defaultOptions,
  /** @internal */ fs = nodefs
): Result {
  return detectDuplicatePackages(
    gatherModulesFromGraph(graph, {}, fs),
    options
  );
}

export function checkForDuplicatePackages(
  sourceMap: MixedSourceMap,
  options: Options = defaultOptions,
  /** @internal */ fs = nodefs
): Result {
  return detectDuplicatePackages(
    gatherModulesFromSourceMap(sourceMap, {}, fs),
    options
  );
}
