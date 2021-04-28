/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

/**
 * @typedef {import("@babel/core").ConfigAPI} ConfigAPI
 * @typedef {import("@babel/core").PluginItem} PluginItem
 * @typedef {import("@babel/core").TransformOptions} TransformOptions
 *
 * @typedef {{
 *   dev?: boolean;
 *   disableImportExportTransform?: boolean;
 *   enableBabelRuntime?: boolean;
 *   lazyImportExportTransform?: boolean | string[];
 *   unstable_transformProfile?: "default" | "hermes-canary" | "hermes-stable";
 *   useTransformReactJSXExperimental?: boolean;
 *   withDevTools?: boolean;
 * }} MetroPresetOptions
 *
 * @typedef {MetroPresetOptions & { additionalPlugins?: PluginItem[]; }} PresetOptions
 */

/** @type {(api?: ConfigAPI, opts?: PresetOptions) => TransformOptions} */
module.exports = (_, { additionalPlugins, ...options } = {}) => {
  return {
    presets: [["module:metro-react-native-babel-preset", options]],
    overrides: [
      {
        test: /\.tsx?$/,
        plugins: [
          // @babel/plugin-transform-typescript doesn't support `const enum`s.
          // See https://babeljs.io/docs/en/babel-plugin-transform-typescript#caveats
          // for more details.
          "const-enum",

          ...(Array.isArray(additionalPlugins) ? additionalPlugins : []),
        ],
      },
    ],
  };
};
