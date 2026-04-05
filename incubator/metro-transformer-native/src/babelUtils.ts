import type { TransformOptions, PluginItem } from "@babel/core";
import type { PluginCache } from "./babelPluginCache";
import type { ArrayUpdates } from "./utils";
import { getUpdatedArray } from "./utils";

/**
 * A visitor function which will be called for each known plugin in the config, allowing edits to the plugin
 * configuration.
 * - return the same plugin item to keep it unchanged, will be compared via ===
 * - return a new plugin item to replace it in the config
 * - return null to remove it from the config
 */
export type PluginVisitor = (
  pluginItem: PluginItem,
  moduleName?: string,
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
  cache: PluginCache,
  preset = false
): PluginItem[] {
  const updates: ArrayUpdates<PluginItem> = {};

  // go through and record any updates based on the visitor function
  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const newValue = visitor(plugin, cache.identify(plugin), preset);
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
  visitor: PluginVisitor,
  cache: PluginCache
): TransformOptions {
  const { plugins, overrides, presets } = options;

  // check the plugin array for updates if it exists
  const newPlugins = plugins ? updatePlugins(plugins, visitor, cache) : plugins;
  const newPresets = presets
    ? updatePlugins(presets, visitor, cache, true)
    : presets;
  let newOverrides = overrides;

  if (overrides && overrides.length > 0) {
    const updates: ArrayUpdates<TransformOptions> = {};
    for (let i = 0; i < overrides.length; i++) {
      const override = overrides[i];
      // process the override with the visitor, this will return a new config if changes were made.
      let newOverride: TransformOptions | null = updateTransformOptions(
        override,
        visitor,
        cache
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
