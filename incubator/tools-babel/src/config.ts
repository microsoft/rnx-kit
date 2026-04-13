import type {
  PluginItem,
  TransformCaller,
  TransformOptions,
} from "@babel/core";
import { loadOptions, loadPartialConfig } from "@babel/core";
import { lazyInit } from "@rnx-kit/reporter";
import fs from "node:fs";
import path from "node:path";
import {
  getPluginKey,
  pluginTraceFactory,
  shouldInstrumentPlugins,
} from "./plugins.ts";
import type { BabelTransformerArgs, TransformerSettings } from "./types.ts";
import type { BabelTransformerOptions } from "./types.ts";

// cache the hot module reload config the first time it is requested.
const getHmrConfig = lazyInit(() =>
  require("@react-native/babel-preset/src/configs/hmr")()
);

function checkRcFile(projectRoot: string, file: string): string | undefined {
  const filePath = path.resolve(projectRoot, file);
  return fs.existsSync(filePath) ? filePath : undefined;
}

function assertValue<T>(value: T | null | undefined, message?: string): T {
  if (value == null) {
    throw new Error(message ?? "Unexpected null or undefined value");
  }
  return value;
}

/**
 * Create the base babel config for the transformer.
 */
const getBabelRC = (function () {
  let babelRC: TransformOptions | null = null;

  return function _getBabelRC({
    projectRoot,
    extendsBabelConfigPath,
    experimentalImportSupport,
    ...options
  }: BabelTransformerOptions) {
    if (babelRC != null) {
      return babelRC;
    }

    const rcExtends =
      extendsBabelConfigPath ??
      checkRcFile(projectRoot, ".babelrc") ??
      checkRcFile(projectRoot, ".babelrc.js") ??
      checkRcFile(projectRoot, "babel.config.js");

    return (babelRC = assertValue(
      loadPartialConfig({
        extends: rcExtends,
        cwd: projectRoot,
        plugins: [],
        ...(rcExtends == null && {
          presets: [
            [
              require("@react-native/babel-preset"),
              {
                projectRoot,
                ...options,
                disableImportExportTransform: experimentalImportSupport,
              },
            ],
          ],
        }),
      })?.options,
      "Failed to load a Babel config. Please ensure you have a valid Babel config file or that @react-native/babel-preset is installed."
    ));
  };
})();

/**
 * Optionally filters the set of plugins in the config based on the provided disabled plugin keys. To do this the config is fully
 * loaded which will resolve all presets and overrides into a flattened plugins array. This allows matching on key rather than comparing
 * resolution results.
 * @param config babel TransformOptions to operate on
 * @param disabledPlugins a set of plugin keys to disable
 * @returns either the original config, or a filtered config if disabled plugins were found, or null if the file should be skipped
 */
export function filterConfigPlugins(
  config: TransformOptions,
  disabledPlugins?: Set<string>
): TransformOptions | null {
  if (!disabledPlugins || disabledPlugins.size === 0) {
    return config;
  }

  // to disable the plugins, we need to load the options which will resolve presets & overrides and give the full plugin list
  const newConfig: TransformOptions | null = loadOptions(config);
  if (newConfig && newConfig.plugins && newConfig.plugins.length > 0) {
    newConfig.plugins = newConfig.plugins.filter((plugin: PluginItem) => {
      const key = getPluginKey(plugin);
      return key == null || !disabledPlugins.has(key);
    });
  }
  return newConfig;
}

/**
 * Get the babel config for a specific file. This caches as much of the config as possible
 * across files, only adding file-specific settings (filename, HMR plugins) per call.
 * @param args the transformer args, including file specific options
 * @returns the babel config for the file or null if the file should be skipped
 */
export function getBabelConfig(
  args: BabelTransformerArgs,
  settings: Partial<TransformerSettings> = {}
): TransformOptions | null {
  const { filename, options, plugins: argPlugins } = args;
  const { configCallerMixins } = settings;
  const { enableBabelRCLookup = true, dev, hot } = options;

  // make a copy of the cached config, duplicating the plugins array as well so it can be modified
  const babelRc = { ...getBabelRC(options) };
  const plugins = (babelRc.plugins = babelRc.plugins
    ? [...babelRc.plugins]
    : []);

  // setup hot module reload if required, mixin the config and append any plugins
  if (dev && hot && !filename.includes("node_modules")) {
    const { plugins: hmrPlugins, ...hmrConfig } = getHmrConfig();
    Object.assign(babelRc, hmrConfig);
    if (hmrPlugins && hmrPlugins.length > 0) {
      plugins.push(...hmrPlugins);
    }
  }

  // conditionally enable plugin performance tracing, only enabled if requested as it adds overhead to every visitor call
  const wrapPluginVisitorMethod = shouldInstrumentPlugins()
    ? pluginTraceFactory()
    : undefined;

  // add the parameter plugins if present (typically there are two fixed ones metro adds)
  if (argPlugins && argPlugins.length > 0) {
    plugins.push(...argPlugins);
  }

  // now configure the full config for this file
  return Object.assign(babelRc, {
    filename,
    caller: {
      name: "metro",
      bundler: "metro", // custom metro key
      platform: options.platform,
      ...configCallerMixins, // custom mixins for caller
    } as TransformCaller,
    babelrc: enableBabelRCLookup,
    envName: dev ? "development" : process.env.BABEL_ENV || "production",
    code: false,
    highlightCode: true,
    ast: true,
    cloneInputAst: false,
    sourceType: "unambiguous",
    wrapPluginVisitorMethod,
  });
}
