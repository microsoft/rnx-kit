import type {
  PluginItem,
  PluginObj,
  ConfigItem,
  PluginTarget,
  TransformOptions,
} from "@babel/core";
import type { TraceFunction } from "./types";

export type ResolvedPlugin = {
  key: string | undefined | null;
  manipulateOptions?: PluginObj["manipulateOptions"];
  post?: PluginObj["post"];
  pre?: PluginObj["pre"];
  visitor: PluginObj["visitor"];
  options: object;
};

// oxlint-disable-next-line typescript/no-explicit-any
type AnyFuncType = (...args: any[]) => void;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isConfigItem(plugin: PluginItem): plugin is ConfigItem {
  return isPlainObject(plugin) && "value" in plugin;
}

export function isPluginObj(plugin: PluginItem): plugin is PluginObj {
  return isPlainObject(plugin) && "visitor" in plugin;
}

export function getPluginTarget(plugin: PluginItem): PluginTarget | undefined {
  if (plugin != null) {
    if (Array.isArray(plugin)) {
      return plugin[0];
    } else if (isConfigItem(plugin)) {
      return plugin.value;
    } else if (!isPluginObj(plugin)) {
      return plugin;
    }
  }
  return undefined;
}

export function getPluginKey(plugin: PluginItem): string | null | undefined {
  if (isPluginObj(plugin)) {
    return (plugin as ResolvedPlugin).key;
  }
  return undefined;
}

/**
 * Create the trace factory that wraps visitor methods for instrumentation
 */
export const pluginTraceFactory = (() => {
  let factory: TransformOptions["wrapPluginVisitorMethod"] | null = null;
  return (trace: TraceFunction) => {
    if (factory) {
      return factory;
    }
    return (factory = <T extends AnyFuncType>(
      key: string,
      _visitorType: "enter" | "exit",
      fn: AnyFuncType
    ) => {
      const opName = `--plugin: ${key}`;
      function thisWrapper(this: ThisParameterType<T>, ...args: Parameters<T>) {
        return trace(opName, () => fn.apply(this, args));
      }
      return thisWrapper;
    });
  };
})();

/**
 * Helper to avoid creating new arrays unless necessary. This is the value setter with an update cache
 */
type ArrayUpdates<T> = Record<number, T | null>;

function getUpdatedArray<T>(base: T[], updates: ArrayUpdates<T>): T[] {
  if (Object.keys(updates).length === 0) {
    return base;
  }
  const result: T[] = [];
  for (let i = 0; i < base.length; i++) {
    const entry = i in updates ? updates[i] : base[i];
    if (entry !== null) {
      result.push(entry);
    }
  }
  return result;
}

/**
 * A visitor function which will be called for each known plugin in the config, allowing edits to the plugin
 * configuration.
 * - return the same plugin item to keep it unchanged, will be compared via ===
 * - return a new plugin item to replace it in the config
 * - return null to remove it from the config
 */
export type PluginVisitor = (
  pluginItem: PluginItem,
  preset?: boolean
) => PluginItem | null;

/**
 * Modify the plugins array based on the provided visitor function, this will only create a new array if changes are made.
 * Updates can be detected by reference equality checks on the plugin array
 * @param plugins list of plugins to (potentially) modify
 * @param visitor visitor function called for each known plugin in the config
 * @param cache plugin cache used to identify plugins and return their module name
 * @returns either the original array (if unchanged) or a new array.
 */
export function updatePlugins(
  plugins: PluginItem[],
  visitor: PluginVisitor,
  preset = false
): PluginItem[] {
  const updates: ArrayUpdates<PluginItem> = {};

  // go through and record any updates based on the visitor function
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const newValue = visitor(plugin, preset);
    if (newValue !== plugin) {
      updates[i] = newValue;
    }
  }

  // return the new array if there were changes, otherwise return the original to preserve reference equality
  return getUpdatedArray(plugins, updates);
}

/**
 * Update the plugins in a babel transform options object based on the provided visitor function, this will only
 * create a new config object if changes are made.
 * @param options transform options to update
 * @param visitor visitor function called for each known plugin in the config
 * @param cache plugin cache used to identify plugins and return their module name
 * @returns either the original config (if unchanged) or a new config object.
 */
export function updateTransformOptions(
  options: TransformOptions,
  visitor: PluginVisitor
): TransformOptions {
  const { plugins, overrides, presets } = options;

  // check the plugin array for updates if it exists
  const newPlugins = plugins ? updatePlugins(plugins, visitor) : plugins;
  const newPresets = presets ? updatePlugins(presets, visitor, true) : presets;
  let newOverrides = overrides;

  if (overrides && overrides.length > 0) {
    const updates: ArrayUpdates<TransformOptions> = {};
    for (let i = 0; i < overrides.length; i++) {
      const override = overrides[i];
      // process the override with the visitor, this will return a new config if changes were made.
      let newOverride: TransformOptions | null = updateTransformOptions(
        override,
        visitor
      );

      // see if all plugins were removed and it is effectively empty.
      if (newOverride?.plugins?.length === 0) {
        const keyLength = Object.keys(newOverride).length;
        // if there are no plugins and the only other key is test, then this override will never apply so we can remove it
        if (keyLength === 1 || (keyLength === 2 && newOverride.test)) {
          newOverride = null;
        }
      }

      // record the change if the override was modified or removed
      if (newOverride !== override) {
        updates[i] = newOverride;
      }
    }
    // finalize the overrides array, modifying it if there were changes.
    newOverrides = getUpdatedArray(overrides, updates);
  }

  if (
    newPlugins !== plugins ||
    newOverrides !== overrides ||
    newPresets !== presets
  ) {
    return {
      ...options,
      presets: newPresets,
      plugins: newPlugins,
      overrides: newOverrides,
    };
  }

  return options;
}
