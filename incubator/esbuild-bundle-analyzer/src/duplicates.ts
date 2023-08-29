import type { Result } from "@rnx-kit/metro-plugin-duplicates-checker";
import {
  detectDuplicatePackages,
  normalizePath,
  resolveModule,
} from "@rnx-kit/metro-plugin-duplicates-checker";
import type { Metafile } from "./metafile";
import type { Graph, Import, Item, ModuleMap, Path } from "./types";

/** Generates a map of all the entry points and imports in the metafile.
 * Maps each module to the module that imports it and the import type.
 *
 * @param metafile The esbuild metafile
 * @returns Module object containing all the entry points and imports
 */
export function generateGraph(metafile: Metafile): Graph {
  const entryPoints: Record<string, string> = {};
  const imports: Record<string, Import> = {};

  for (const output in metafile.outputs) {
    const entryPoint = metafile.outputs[output].entryPoint;
    if (entryPoint) {
      entryPoints[entryPoint] = output;
      imports[entryPoint] = {
        input: entryPoint,
        original: undefined,
        kind: "entry-point",
      };
    }
  }

  // BFS: shortest path to an entry point
  const queue: string[] = Object.keys(entryPoints);
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;

    for (const item of metafile.inputs[path].imports) {
      if (
        !item.external &&
        !Object.prototype.hasOwnProperty.call(imports, item.path)
      ) {
        imports[item.path] = {
          input: path,
          original: item.original,
          kind: item.kind,
        };

        queue.push(item.path);
      }
    }
  }

  return {
    entryPoints,
    imports,
  };
}

/**
 * Returns a map of import paths from the entry point to
 * a file to showcase why and how its being included in the bundle.
 *
 * @param graph Module object containing all the entry points and imports
 * @param file The file to check why its being included in the bundle
 * @returns Import path from the entry point to a file
 */
export function getWhyFileInBundle(graph: Graph, file: string): Path {
  const path: Path = {};
  let current = file;
  let importer = graph.imports[current];
  const items: Item[] = [{ input: file, import: undefined }];

  if (!importer) return path;

  // Traverse from path to root entry point
  while (current !== importer.input) {
    items.push({
      input: importer.input,
      import: {
        input: current,
        original: importer.original,
        kind: importer.kind,
      },
    });

    current = importer.input;
    importer = graph.imports[current];

    if (!importer) break;
  }

  items.reverse();

  let input;
  for (const item of items) {
    if (item.import) {
      path[input || item.input] = item;
      input = item.import.input;
    }
  }

  return path;
}

/**
 * Finds all duplicated files in the bundle and returns a map of
 * import paths from the entry point to the duplicated file.
 *
 * @param metafile The metafile
 * @param graph Module object containing all the entry points and imports
 * @returns List of import path from the entry point to a duplicated file
 */
export function getWhyDuplicatesInBundle(
  metafile: Metafile,
  graph: Graph
): Path[] {
  const modules: Record<string, string[]> = {};
  const paths: Path[] = [];

  for (const input of Object.values(metafile.inputs)) {
    for (const imp of input.imports) {
      if (imp.original && !imp.original.startsWith(".")) {
        modules[imp.original] ||= [];
        if (!modules[imp.original].includes(imp.path)) {
          modules[imp.original].push(imp.path);
        }
      }
    }
  }

  for (const imports of Object.values(modules)) {
    if (imports.length > 1) {
      for (const file of imports) {
        paths.push(getWhyFileInBundle(graph, file));
      }
    }
  }

  return paths;
}

/**
 * Finds all duplicates in the metafile. This is very similar to the
 * metro-plugin-duplicates-checker, but it uses the esbuild metafile
 * instead of the metro graph/bundle/sourcemap.
 *
 * @param inputs The metafile inputs
 * @param namespace The namespace to remove from the file paths
 * @returns List of duplicated files
 */
export function getDuplicates(
  inputs: Metafile["inputs"],
  namespace: string
): Result {
  const moduleMap: ModuleMap = {};

  for (const file in inputs) {
    const { name, version, absolutePath } = resolveModule(
      normalizePath(file.replace(namespace, ""))
    );

    moduleMap[name] ||= {};
    moduleMap[name][version] ||= new Set();
    moduleMap[name][version].add(absolutePath);
  }

  return detectDuplicatePackages(moduleMap, {});
}
