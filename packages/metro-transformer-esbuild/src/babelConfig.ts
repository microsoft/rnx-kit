import type {
  ConfigItem,
  PluginItem,
  TransformCaller,
  TransformOptions,
} from "@babel/core";
import { loadPartialConfig } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import fs from "node:fs";
import path from "node:path";
import type { FilePluginOptions, TransformerArgs } from "./types";
import { lazyInit, requireFromCwd } from "./utils";

type BabelTransformerOptions = BabelTransformerArgs["options"];

const blockedPlugins = new Set<string>(["transform-typescript", "const-enum"]);

const jsxPlugins = new Set<string>([
  "transform-react-jsx",
  "transform-react-jsx-development",
  "transform-react-jsx-self",
  "transform-react-jsx-source",
]);

// cache the hot module reload config the first time it is requested.
const getHmrConfig = lazyInit(() =>
  requireFromCwd("@react-native/babel-preset/src/configs/hmr")()
);

/**
 * Look up config files in the project root.
 * @param projectRoot effectively process.cwd, the directory where bundle is being executed
 * @returns a path to a babel config file if found, otherwise undefined
 */
/**
 * @internal
 */
export function findBabelConfigFile(projectRoot: string): string | undefined {
  // same order as @react-native/metro-babel-transformer
  const testFiles = [".babelrc", ".babelrc.js", "babel.config.js"];
  for (const file of testFiles) {
    const filePath = path.resolve(projectRoot, file);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return undefined;
}

/**
 * Given the options for this transformer, load the base babel config that is not file specific and cache
 * the results.
 * @internal
 */
export const getPartialBabelConfig = (() => {
  let partialConfig: TransformOptions | undefined = undefined;
  return (options: BabelTransformerOptions): TransformOptions => {
    if (partialConfig) {
      return partialConfig;
    }
    const {
      projectRoot = process.cwd(),
      enableBabelRCLookup = true,
      extendsBabelConfigPath,
      experimentalImportSupport,
      ...presetOptions
    } = options;
    const configFile =
      extendsBabelConfigPath ?? findBabelConfigFile(projectRoot);

    // populate the basic babel config options
    const babelRc: TransformOptions = {
      sourceType: "unambiguous",
      plugins: [],
      babelrc: enableBabelRCLookup,
      cwd: projectRoot,
      envName: options.dev
        ? "development"
        : process.env.BABEL_ENV || "production",
      code: false,
      highlightCode: true,
    };

    // either route to a config file or create a default config
    if (configFile) {
      babelRc.extends = configFile;
    } else {
      // If no babel config file is found, load the default react-native config
      babelRc.presets = [
        [
          requireFromCwd("@react-native/babel-preset"),
          {
            projectRoot,
            ...presetOptions,
            disableImportExportTransform: experimentalImportSupport,
          },
        ],
      ];
    }

    // call babel to resolve the plugins and load the config into memory.
    partialConfig = loadPartialConfig(babelRc)?.options;
    if (!partialConfig) {
      throw new Error(
        "Failed to load a Babel config. Please ensure you have a valid Babel config file in your project or that @react-native/babel-preset is installed."
      );
    }
    return partialConfig;
  };
})();

/**
 * @internal
 */
export function resolvePluginName(plugin: PluginItem): string | undefined {
  if (typeof plugin === "string") {
    return plugin;
  } else if (Array.isArray(plugin)) {
    if (typeof plugin[0] === "string") {
      return plugin[0];
    }
  } else if (typeof plugin === "object" && plugin !== null) {
    return (plugin as ConfigItem).name;
  }
  return undefined;
}

/**
 * @internal
 */
export function addPluginToConfig(
  { handleJsx, loader }: FilePluginOptions,
  plugin: PluginItem
) {
  const pluginName = resolvePluginName(plugin);
  const isEsbuildHandlingJsx = handleJsx && loader != null;
  if (
    pluginName &&
    (blockedPlugins.has(pluginName) ||
      (isEsbuildHandlingJsx && jsxPlugins.has(pluginName)))
  ) {
    return false;
  }
  return true;
}

/**
 * Get the babel config for a specific file. This will attempt to cache as much information s
 * @param filename
 * @param options
 * @param pluginOptions
 * @param mixinPlugins
 * @returns
 */
export function getBabelConfig({
  pluginOptions,
  filename,
  options,
  plugins: mixinPlugins,
}: TransformerArgs): TransformOptions {
  // load the partial config
  const partialConfig = getPartialBabelConfig(options);

  // build the list of plugins to use, filtering out plugins that should not apply
  const plugins: PluginItem[] = [];
  for (const plugin of partialConfig.plugins || []) {
    if (addPluginToConfig(pluginOptions, plugin)) {
      plugins.push(plugin);
    }
  }
  if (mixinPlugins) {
    for (const plugin of mixinPlugins) {
      if (addPluginToConfig(pluginOptions, plugin)) {
        plugins.push(plugin);
      }
    }
  }

  // setup hot module reload if in dev mode and this is not a node module
  const hmrConfig =
    options.dev && !filename.includes("node_modules")
      ? getHmrConfig()
      : undefined;
  if (hmrConfig && hmrConfig.plugins) {
    plugins.push(...hmrConfig.plugins);
  }

  // return the full babel config for the file
  return {
    ...partialConfig,
    ...hmrConfig,
    filename,
    caller: {
      name: "metro",
      bundler: "metro",
      platform: options.platform,
    } as TransformCaller,
    ast: true,
    cloneInputAst: false,
    plugins,
  };
}
