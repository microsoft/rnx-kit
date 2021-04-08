import { gatherModules, ModuleMap } from "./gatherModules";
import type { MixedSourceMap } from "./SourceMap";

export type Options = {
  ignoredModules?: string[];
  bannedModules?: string[];
};

export const defaultOptions: Options = {
  ignoredModules: [],
  bannedModules: [],
};

export function countCopies(module: ModuleMap[string]): number {
  return Object.keys(module).reduce((count, version) => {
    return count + module[version].size;
  }, 0);
}

export function printDuplicates(module: ModuleMap[string]): void {
  Object.keys(module)
    .sort()
    .forEach((version) => {
      Array.from(module[version])
        .sort()
        .forEach((p) => console.warn(`  ${version} ${p}`));
    });
}

export function detectDuplicatePackages(
  bundledModules: ModuleMap,
  { ignoredModules = [], bannedModules = [] }: Options
): number {
  return Object.keys(bundledModules).reduce((count, name) => {
    if (ignoredModules.includes(name)) {
      return count;
    }

    const currentModule = bundledModules[name];

    if (bannedModules.includes(name)) {
      console.error(`${name} (banned)`);
      printDuplicates(currentModule);
      return count + 1;
    }

    const numCopies = countCopies(currentModule);
    if (numCopies > 1) {
      console.error(`${name} (found ${numCopies} copies)`);
      printDuplicates(currentModule);
      return count + 1;
    }

    return count;
  }, 0);
}

export function checkForDuplicatePackages(
  sourceMap: MixedSourceMap,
  options: Options = defaultOptions
): number {
  return detectDuplicatePackages(gatherModules(sourceMap, {}), options);
}
