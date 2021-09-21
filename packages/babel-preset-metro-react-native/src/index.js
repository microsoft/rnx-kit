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

/**
 * Returns plugin for transforming `const enum` if necessary.
 *
 * @babel/plugin-transform-typescript doesn't support `const enum`s until 7.15.
 * See https://github.com/babel/babel/pull/13324.
 */
function constEnumPlugin() {
  try {
    const {
      version,
    } = require("@babel/plugin-transform-typescript/package.json");
    const { [0]: major, [1]: minor } = version.split(".");
    if (Number(major) * 1000 + Number(minor) >= 7015) {
      return [];
    }
  } catch (_) {
    // assume we need `const-enum`
  }

  return ["const-enum"];
}

/**
 * Returns additional options for `metro-react-native-babel-preset`.
 * @param {string | undefined} transformProfile
 * @returns {MetroPresetOptions | undefined}
 */
function overridesFor(transformProfile) {
  switch (transformProfile) {
    case "esbuild":
      return {
        disableImportExportTransform: true,
      };

    default:
      return transformProfile
        ? {
            unstable_transformProfile:
              /** @type {MetroPresetOptions["unstable_transformProfile"]} */ (
                transformProfile
              ),
          }
        : undefined;
  }
}

/** @type {(api?: ConfigAPI, opts?: PresetOptions) => TransformOptions} */
module.exports = (
  _,
  { additionalPlugins, unstable_transformProfile, ...options } = {}
) => {
  return {
    presets: [
      [
        "module:metro-react-native-babel-preset",
        {
          ...options,
          ...overridesFor(unstable_transformProfile),
        },
      ],
    ],
    overrides: [
      {
        test: /\.tsx?$/,
        plugins: [
          ...constEnumPlugin(),
          ...(Array.isArray(additionalPlugins) ? additionalPlugins : []),
        ],
      },
    ],
  };
};
