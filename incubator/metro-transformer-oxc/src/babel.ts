/**
 * Everything in this file was copied more or less verbatim from
 * https://github.com/facebook/react-native/blob/v0.84.1/packages/react-native-babel-transformer/src/index.js
 * with only typing fixes to make TypeScript happy.
 */
import type { PluginItem, TransformOptions } from "@babel/core";
import type { BabelTransformerArgs } from "metro-babel-transformer";
import * as fs from "node:fs";
import * as path from "node:path";

type BabelTransformerOptions = BabelTransformerArgs["options"];

/**
 * Return a memoized function that checks for the existence of a
 * project level .babelrc file, and if it doesn't exist, reads the
 * default RN babelrc file and uses that.
 */
const getBabelRC = (function () {
  let babelRC: TransformOptions | null = null;

  return function _getBabelRC({
    projectRoot,
    extendsBabelConfigPath,
    ...options
  }: BabelTransformerOptions) {
    if (babelRC != null) {
      return babelRC;
    }

    babelRC = {
      plugins: [],
      extends: extendsBabelConfigPath,
    };

    if (extendsBabelConfigPath) {
      return babelRC;
    }

    // Let's look for a babel config file in the project root.
    let projectBabelRCPath;

    // .babelrc
    if (projectRoot) {
      projectBabelRCPath = path.resolve(projectRoot, ".babelrc");
    }

    if (projectBabelRCPath) {
      // .babelrc.js
      if (!fs.existsSync(projectBabelRCPath)) {
        projectBabelRCPath = path.resolve(projectRoot, ".babelrc.js");
      }

      // babel.config.js
      if (!fs.existsSync(projectBabelRCPath)) {
        projectBabelRCPath = path.resolve(projectRoot, "babel.config.js");
      }

      // If we found a babel config file, extend our config off of it
      // otherwise the default config will be used
      if (fs.existsSync(projectBabelRCPath)) {
        // $FlowFixMe[incompatible-use] `extends` is missing in null or undefined.
        babelRC.extends = projectBabelRCPath;
      }
    }

    // If a babel config file doesn't exist in the project then
    // the default preset for react-native will be used instead.
    // $FlowFixMe[incompatible-use] `extends` is missing in null or undefined.
    // $FlowFixMe[incompatible-type] `extends` is missing in null or undefined.
    if (!babelRC.extends) {
      const { experimentalImportSupport, ...presetOptions } = options;

      // $FlowFixMe[incompatible-use] `presets` is missing in null or undefined.
      babelRC.presets = [
        [
          require("@react-native/babel-preset"),
          {
            projectRoot,
            ...presetOptions,
            disableImportExportTransform: experimentalImportSupport,
            enableBabelRuntime: options.enableBabelRuntime,
          },
        ],
      ];
    }

    return babelRC;
  };
})();

/**
 * Given a filename and options, build a Babel
 * config object with the appropriate plugins.
 */
export function buildBabelConfig(
  filename: string,
  options: BabelTransformerOptions & { hot?: boolean },
  plugins: PluginItem[] = []
): TransformOptions {
  const babelRC = getBabelRC(options);

  const extraConfig: TransformOptions = {
    babelrc:
      typeof options.enableBabelRCLookup === "boolean"
        ? options.enableBabelRCLookup
        : true,
    code: false,
    cwd: options.projectRoot,
    envName: options.dev
      ? "development"
      : process.env.BABEL_ENV || "production",
    filename,
    highlightCode: true,
  };

  let config: TransformOptions = {
    ...babelRC,
    ...extraConfig,
  };

  const withExtraPlugins = (config.plugins = [
    ...(config.plugins ?? []),
    ...plugins,
  ]);

  if (options.dev && options.hot) {
    // Note: this intentionally doesn't include the path separator because
    // I'm not sure which one it should use on Windows, and false positives
    // are unlikely anyway. If you later decide to include the separator,
    // don't forget that the string usually *starts* with "node_modules" so
    // the first one often won't be there.
    const mayContainEditableReactComponents =
      filename.indexOf("node_modules") === -1;

    if (mayContainEditableReactComponents) {
      const hmrConfig = require("@react-native/babel-preset/src/configs/hmr")();
      hmrConfig.plugins = withExtraPlugins.concat(hmrConfig.plugins);
      config = { ...config, ...hmrConfig };
    }
  }

  return {
    ...babelRC,
    ...config,
  };
}
