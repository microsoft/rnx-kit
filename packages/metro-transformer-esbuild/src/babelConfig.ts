import type { TransformCaller, TransformOptions } from "@babel/core";
import { loadPartialConfig } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import fs from "node:fs";
import path from "node:path";
import { BabelModeHelper } from "./babelMode";
import { getBabelPresetPath } from "./babelPluginCache";
import type { TransformerArgs } from "./types";
import { lazyInit, requireFromCwd } from "./utils";

type BabelTransformerOptions = BabelTransformerArgs["options"];

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
      ast: true,
      cloneInputAst: false,
    };

    // either route to a config file or create a default config
    if (configFile) {
      babelRc.extends = configFile;
    } else {
      // If no babel config file is found, load the default react-native config
      babelRc.presets = [
        [
          require(getBabelPresetPath()),
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

export function getCachableConfig(
  { options, plugins }: TransformerArgs,
  modeHelper: BabelModeHelper
): TransformOptions {
  // see if options have already been cached for this mode, if so return them immediately
  const cachedOptions = modeHelper.getCachedOptions();
  if (cachedOptions) {
    return cachedOptions;
  }

  // get the partial config that is shared across all files and modes, this is cached on the first call
  const partialConfig = getPartialBabelConfig(options);

  // now create the parts of the config that are specific to this mode or otherwise fixed, this adjust the config
  // for the current mode, then cache the results so that we only do this once for each mode.
  return modeHelper.adjustAndCacheOptions({
    ...partialConfig,
    // caller informs the preset resolution cache and disambiguates the different configs
    caller: {
      name: "metro",
      bundler: "metro", // custom metro key
      platform: options.platform,
      rnxMode: modeHelper.key, // custom key for this plugin
    } as TransformCaller,
    // the parameterized plugins are fixed additions by metro and need to be mixed in but are stable
    plugins: [...(partialConfig.plugins ?? []), ...(plugins ?? [])],
  });
}

/**
 * Get the babel config for a specific file. This caches as much of the config as possible
 * across files, only adding file-specific settings (filename, HMR plugins) per call.
 * @param args the transformer args, including file specific options
 * @returns the babel config for the file
 */
export function getBabelConfig(args: TransformerArgs): TransformOptions {
  const { filename, options, pluginOptions } = args;
  // get the cached partial config
  const modeHelper = BabelModeHelper.find(pluginOptions.mode);
  const cachedConfig = getCachableConfig(args, modeHelper);
  const plugins = [...(cachedConfig.plugins ?? [])];

  // setup the hmr config if necessary, note hot isn't on the type but this is the check in the RN transformer
  const useHmr = options.dev && (options as { hot?: boolean }).hot;
  const hmrConfig =
    useHmr && !filename.includes("node_modules") ? getHmrConfig() : undefined;

  // add the hmr plugins to the mixin list so they get filtered with everything else
  if (hmrConfig && hmrConfig.plugins) {
    plugins.push(...hmrConfig.plugins);
  }

  // return the config plus any file specific options
  return {
    ...cachedConfig,
    ...hmrConfig,
    filename,
    plugins,
  };
}
