import type { Graph } from "@rnx-kit/metro-serializer";
import * as fs from "fs";
import { join } from "path";
import pkgDir from "pkg-dir";
import type { BasicSourceMap, IndexMap, MixedSourceMap } from "./SourceMap";

type ModuleInfo = {
  name: string;
  version: string;
  absolutePath: string;
};

export type ModuleMap = {
  [name: string]: {
    [version: string]: Set<string>;
  };
};

export function normalizePath(p: string): string {
  return p.replace(/webpack:\/\/\//g, "").replace(/[\\]+/g, "/");
}

export function resolveModule(source: string): ModuleInfo {
  const pkg = pkgDir.sync(source);
  if (!pkg) {
    throw new Error(`Unable to find package '${pkg}'`);
  }

  const { name, version } = JSON.parse(
    fs.readFileSync(join(pkg, "package.json"), { encoding: "utf-8" })
  );
  if (!name) {
    throw new Error(`Unable to parse name of '${pkg}'`);
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
  graph: Graph,
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
