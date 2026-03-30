import type { PluginItem } from "@babel/core";
import path from "node:path";
import { lazyInit } from "./utils";

// oxlint-disable-next-line typescript/no-explicit-any
export type LoadedPluginFunction = (...args: any[]) => any;
export type LoadedPlugin = LoadedPluginFunction | object;

function tryRequireResolve(
  moduleName: string,
  requireFrom: string | string[] = process.cwd()
): string | undefined {
  const paths = Array.isArray(requireFrom) ? requireFrom : [requireFrom];
  for (const path of paths) {
    try {
      return require.resolve(moduleName, { paths: [path] });
    } catch {
      // try next path
    }
  }
  return undefined;
}

function requireResolve(moduleName: string, paths: string | string[]): string {
  const resolved = tryRequireResolve(moduleName, paths);
  if (!resolved) {
    throw new Error(
      `Unable to resolve module ${moduleName} from paths ${Array.isArray(paths) ? paths.join(", ") : paths}`
    );
  }
  return resolved;
}

/**
 * Cached preset path, resolved from the project root
 */
export const getBabelPresetPath = lazyInit(() =>
  require.resolve("@react-native/babel-preset", { paths: [process.cwd()] })
);

/**
 * Cache for babel plugin info, keyed by both module name and resolved path
 */
export const getPluginCache = lazyInit(() => {
  const cwd = process.cwd();
  const resolveFrom = [path.dirname(getBabelPresetPath())];
  const rnxPresetPath = tryRequireResolve(
    "@rnx-kit/babel-preset-metro-react-native",
    cwd
  );
  if (rnxPresetPath) {
    resolveFrom.push(path.dirname(rnxPresetPath));
  }
  resolveFrom.push(cwd);
  return new PluginCache(resolveFrom);
});

type BabelPluginReference = {
  moduleName?: string;
  modulePath: string;
  loaded: LoadedPlugin;
};

/**
 * Implementation of the BabelPluginCache interface, this will cache plugin references by both module name and resolved path
 */
export class PluginCache {
  private cache: Record<string, BabelPluginReference> = {};
  private loadedMap = new WeakMap<LoadedPlugin, BabelPluginReference>();
  private resolveFrom: string[];

  constructor(resolveFrom: string[] = [process.cwd()]) {
    this.resolveFrom = resolveFrom;
  }

  add(moduleName: string, optional?: boolean) {
    if (!this.cache[moduleName]) {
      const modulePath = optional
        ? tryRequireResolve(moduleName, this.resolveFrom)
        : requireResolve(moduleName, this.resolveFrom);
      if (modulePath) {
        const ref = this.ensureLocation(modulePath);
        ref.moduleName ??= moduleName;
        this.cache[moduleName] ??= ref;
      }
    }
  }

  /**
   * Ensure the entry exists (but don't return the internal data)
   */
  addLocation(modulePath: string): void {
    this.ensureLocation(modulePath);
  }

  /**
   * Try to identify the module name for this plugin item, returning undefined if it can't be identified or
   * it isn't in the cache already. Note that this will not attempt to resolve the plugin, so it will only work for plugins
   * that have already been added to the cache by module name or path.
   * @param plugin a babel plugin item, in one of its various forms
   */
  identify(plugin: PluginItem): string | undefined {
    if (typeof plugin === "string") {
      return this.cache[plugin]?.moduleName;
    } else if (typeof plugin === "function" || typeof plugin === "object") {
      const ref = this.loadedMap.get(plugin as LoadedPlugin);
      if (ref) {
        return ref.moduleName;
      }
    }
    if (plugin && typeof plugin === "object") {
      if (Array.isArray(plugin)) {
        return this.identify(plugin[0]);
      }
    }
    return undefined;
  }

  /**
   * Get the loaded plugin data for the module name, note this will return the first one found
   * if the module has multiple instances.
   */
  getPlugin(moduleName: string): LoadedPlugin | undefined {
    const ref = this.cache[moduleName];
    return ref ? ref.loaded : undefined;
  }

  /**
   * Load and create the entry for this location
   * @param modulePath resolved path to the plugin module
   * @returns the plugin reference for this module path
   */
  private ensureLocation(modulePath: string): BabelPluginReference {
    if (!this.cache[modulePath]) {
      const loaded = require(modulePath);
      const existing = this.loadedMap.get(loaded);
      this.cache[modulePath] = existing ?? { modulePath, loaded };
      if (!existing) {
        this.addToLoadedMap(this.cache[modulePath]);
      }
    }
    return this.cache[modulePath];
  }

  /**
   * Add the loaded plugin to the WeakMap, double checking the type to not violate WeakMap constraints
   */
  private addToLoadedMap(ref: BabelPluginReference) {
    if (typeof ref.loaded === "object" || typeof ref.loaded === "function") {
      this.loadedMap.set(ref.loaded, ref);
    }
  }
}
