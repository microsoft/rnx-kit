import { findPackageDir, readPackage } from "@rnx-kit/tools-node/package";
import type { ReadOnlyGraph } from "metro";
import type {
  BasicSourceMap,
  IndexMap,
  MixedSourceMap,
} from "metro-source-map";
import * as nodefs from "node:fs";
import * as path from "node:path";

type ModuleInfo = {
  name: string;
  version: string;
  absolutePath: string;
};

export type ModuleMap = Record<string, Record<string, Set<string>>>;

export function normalizePath(p: string): string {
  return p.replaceAll("webpack:///", "").replace(/[\\]+/g, "/");
}

export function resolveModule(
  source: string,
  /** @internal */ fs = nodefs
): ModuleInfo {
  const pkg = findPackageDir(source, fs);
  if (!pkg) {
    throw new Error(`Unable to resolve module '${source}'`);
  }

  const { name, version } = readPackage(pkg, fs);
  if (!name) {
    // Packages using [dual-publish](https://github.com/ai/dual-publish), like
    // [nanoid](https://github.com/ai/nanoid), have a 'package.json' in _all_
    // folders, confusing 'pkg-dir'. We have no choice but to try again with the
    // parent directory.
    return resolveModule(path.dirname(pkg), fs);
  }

  return { name, version, absolutePath: fs.realpathSync.native(pkg) };
}

export function gatherModulesFromSections(
  sections: IndexMap["sections"],
  moduleMap: ModuleMap
): ModuleMap {
  for (const section of sections) {
    gatherModulesFromSourceMap(section.map, moduleMap);
  }
  return moduleMap;
}

export function gatherModulesFromSources(
  sources: BasicSourceMap["sources"],
  moduleMap: ModuleMap,
  /** @internal */ fs = nodefs
): ModuleMap {
  for (const source of sources) {
    const normalizedPath = normalizePath(source);
    if (normalizedPath.toLowerCase().includes("node_modules/")) {
      const { name, version, absolutePath } = resolveModule(normalizedPath, fs);
      if (!moduleMap[name]) {
        moduleMap[name] = {};
      }
      if (!moduleMap[name][version]) {
        moduleMap[name][version] = new Set();
      }
      moduleMap[name][version].add(absolutePath);
    }
  }
  return moduleMap;
}

export function gatherModulesFromGraph(
  graph: ReadOnlyGraph,
  moduleMap: ModuleMap,
  /** @internal */ fs = nodefs
): ModuleMap {
  const sources = Array.from(graph.dependencies.keys());
  return gatherModulesFromSources(sources, moduleMap, fs);
}

export function gatherModulesFromSourceMap(
  sourceMap: MixedSourceMap,
  moduleMap: ModuleMap,
  /** @internal */ fs = nodefs
): ModuleMap {
  if ("sources" in sourceMap) {
    gatherModulesFromSources(sourceMap.sources, moduleMap, fs);
  }
  if ("sections" in sourceMap) {
    gatherModulesFromSections(sourceMap.sections, moduleMap);
  }
  return moduleMap;
}
