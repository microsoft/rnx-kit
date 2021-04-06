import { join } from "path";
import pkgDir from "pkg-dir";
import type { BasicSourceMap, IndexMap, MixedSourceMap } from "./SourceMap";

export type ModuleMap = {
  [name: string]: {
    [version: string]: Set<string>;
  };
};

export function normalizePath(p: string): string {
  return p
    .replace(/webpack:\/\/\//g, "")
    .replace(/[\\]+/g, "/")
    .toLowerCase();
}

export function resolveModule(source: string): [string, string, string] {
  const pkg = pkgDir.sync(source);
  if (!pkg) {
    throw new Error(`Unable to find package '${pkg}'`);
  }

  const { name, version } = require(join(pkg, "package.json"));
  if (!name) {
    throw new Error(`Unable to parse name of '${pkg}'`);
  }

  return [name, version, pkg];
}

export function gatherModulesFromSections(
  sections: IndexMap["sections"],
  moduleMap: ModuleMap
): ModuleMap {
  sections.forEach((section) => gatherModules(section.map, moduleMap));
  return moduleMap;
}

export function gatherModulesFromSources(
  sources: BasicSourceMap["sources"],
  moduleMap: ModuleMap
): ModuleMap {
  sources.forEach((source) => {
    const normalizedPath = normalizePath(source);
    if (normalizedPath.includes("node_modules/")) {
      const [name, version, pkg] = resolveModule(normalizedPath);
      if (!moduleMap[name]) {
        moduleMap[name] = {};
      }
      if (!moduleMap[name][version]) {
        moduleMap[name][version] = new Set();
      }
      moduleMap[name][version].add(pkg);
    }
  });
  return moduleMap;
}

export function gatherModules(
  sourceMap: MixedSourceMap,
  moduleMap: ModuleMap
): ModuleMap {
  if ("sources" in sourceMap) {
    gatherModulesFromSources(sourceMap.sources, moduleMap);
  }
  if ("sections" in sourceMap) {
    gatherModulesFromSections(sourceMap.sections, moduleMap);
  }
  return moduleMap;
}
