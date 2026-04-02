import type {
  PluginItem,
  ConfigAPI,
  TransformOptions,
  TransformCaller,
} from "@babel/core";
import { getPluginCache } from "./babelPluginCache";
import { updateTransformOptions, type PluginVisitor } from "./babelUtils";
import type { BabelMode } from "./types";

export type PresetFunction = (
  api: ConfigAPI,
  ...rest: unknown[]
) => TransformOptions;
export type PresetOverride = PresetFunction & { __presetOverride?: boolean };

export type PluginCaller = TransformCaller & { rnxMode?: string };

export class BabelModeHelper {
  static instances: Record<string, BabelModeHelper> = {};
  static find(mode: BabelMode): BabelModeHelper {
    const key = JSON.stringify(mode);
    if (!this.instances[key]) {
      this.instances[key] = new BabelModeHelper(mode, key);
    }
    return this.instances[key];
  }

  private mode: BabelMode;
  private pluginCache = getPluginCache();
  private blocked = new Set<string>();
  private cachedOptions?: TransformOptions;

  readonly key: string;

  private constructor(mode: BabelMode, key: string) {
    this.mode = mode;
    this.key = key;
    this.disablePluginsForMode();
  }

  /**
   * @returns cached transform options, if set
   */
  getCachedOptions(): TransformOptions | undefined {
    return this.cachedOptions;
  }

  /**
   * Adjust the provided options for the current mode, and cache the results for future calls with the same mode.
   * @param options options to adjust, and then store as cached options
   * @returns the new cached options
   */
  adjustAndCacheOptions(options: TransformOptions): TransformOptions {
    return (this.cachedOptions = updateTransformOptions(
      options,
      this.wrappingVisitor,
      this.pluginCache
    ));
  }

  /**
   * Make any necessary adjustments to the config based on the mode but don't wrap presets
   * @param options options to adjust
   * @returns the adjusted options
   */
  adjustOptions(options: TransformOptions): TransformOptions {
    return updateTransformOptions(options, this.visitor, this.pluginCache);
  }

  /**
   * visitor method to block plugins that should not run in this mode and wrap presets to dynamically
   * filter their plugins based on the mode as well.
   */
  private visitor: PluginVisitor = (
    plugin: PluginItem,
    moduleName?: string
  ) => {
    if (moduleName && this.blocked.has(moduleName)) {
      // if this plugin is in the blocked set for this mode, return null to remove it from the config
      return null;
    }
    return plugin;
  };

  private wrappingVisitor: PluginVisitor = (plugin, moduleName, preset) => {
    // call the base visitor first
    const result = this.visitor(plugin, moduleName, preset);

    // if we have things to block and this is a preset, we need to wrap it to ensure the blocked plugins are removed
    // when the preset runs.
    if (this.blocked.size > 0 && result && preset) {
      // see if this is a standard preset entry type of [presetFunction, options, ...rest]
      if (
        Array.isArray(result) &&
        result.length > 0 &&
        typeof result[0] === "function"
      ) {
        // create a wrapped preset
        const wrappedPreset: PresetFunction = (api, ...rest) => {
          // set up the cache key for this preset based on the mode
          const mode = api.caller(
            (caller) => (caller as PluginCaller)?.rnxMode ?? this.key
          );
          api.cache.using(() => mode);

          // return filtered transform options from the original preset function
          return this.adjustOptions(result[0](api, ...rest));
        };
        return [wrappedPreset, ...result.slice(1)];
      }
    }
    return result;
  };

  /**
   * Given the mode, configure the plugin cache and blocked set to ensure plugins are removed as appropriate
   */
  private disablePluginsForMode() {
    if (this.mode.ts === "native") {
      this.blockPlugin("@babel/plugin-transform-typescript");
      this.blockPlugin("@babel/preset-typescript", true);
      this.blockPlugin("babel-plugin-const-enum", true);
    }
    if (this.mode.jsx === "native") {
      this.blockPlugin("@babel/plugin-transform-react-jsx");
      this.blockPlugin("@babel/plugin-transform-react-jsx-development", true);
      this.blockPlugin("@babel/plugin-transform-react-jsx-self");
      this.blockPlugin("@babel/plugin-transform-react-jsx-source");
    }
  }

  /**
   * setup the cache and data to block a single plugin
   */
  private blockPlugin(moduleName: string, optional?: boolean) {
    // attempt to resolve the plugin and add it to the cache
    this.pluginCache.add(moduleName, optional);
    // add to the blocked set so it's filtered by name if it appears in the config
    this.blocked.add(moduleName);
  }
}
