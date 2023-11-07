import { findPackageDir, readPackage } from "@rnx-kit/tools-node/package";
import * as fs from "fs";
import type { ReadOnlyGraph } from "metro";
import type {
  BasicSourceMap,
  IndexMap,
  MixedSourceMap,
} from "metro-source-map";
import * as path from "path";

type ModuleInfo = {
  name: string;
  version: string;
  absolutePath: string;
};

export type ModuleMap = Record<string, Record<string, Set<string>>>;

export function normalizePath(p: string): string {
  return p.replace(/webpack:\/\/\//g, "").replace(/[\\]+/g, "/");
}

export function resolveModule(source: string): ModuleInfo {
  const pkg = findPackageDir(source);
  if (!pkg) {
    throw new Error(`Unable to resolve module '${source}'`);
  }

  const { name, version } = readPackage(pkg);
  if (!name) {
    // Packages using [dual-publish](https://github.com/ai/dual-publish), like
    // [nanoid](https://github.com/ai/nanoid), have a 'package.json' in _all_
    // folders, confusing 'pkg-dir'. We have no choice but to try again with the
    // parent directory.
    return resolveModule(path.dirname(pkg));
  }

  return { name, version, absolutePath: fs.realpathSync.native(pkg) };
}

export function gatherModulesFromSections(
  sections: IndexMap["sections"],
  moduleMap: ModuleMap
): ModuleMap {
  sections.forEach((section) =>
    gatherModulesFromSourceMap(section.map, moduleMap)
  );
  return moduleMap;
}

export function gatherModulesFromSources(
  sources: BasicSourceMap["sources"],
  moduleMap: ModuleMap
): ModuleMap {
  sources.forEach((source) => {
    const normalizedPath = normalizePath(source);
    if (normalizedPath.toLowerCase().includes("node_modules/")) {
      const { name, version, absolutePath } = resolveModule(normalizedPath);
      if (!moduleMap[name]) {
        moduleMap[name] = {};
      }
      if (!moduleMap[name][version]) {
        moduleMap[name][version] = new Set();
      }
      moduleMap[name][version].add(absolutePath);
    }
  });
  return moduleMap;
}

export function gatherModulesFromGraph(
  graph: ReadOnlyGraph,
  moduleMap: ModuleMap
): ModuleMap {
  const sources = Array.from(graph.dependencies.keys());
  return gatherModulesFromSources(sources, moduleMap);
}

export function gatherModulesFromSourceMap(
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
