/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const { getPreset } = require(require.resolve(
  "metro-react-native-babel-preset",
  { paths: [process.cwd()] }
));

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
 * @typedef {{
 *   additionalPlugins?: PluginItem[];
 *   looseClassTransform?: boolean;
 * }} RnxPresetOptions
 *
 * @typedef {MetroPresetOptions & RnxPresetOptions} PresetOptions
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

/**
 * It's not documented thoroughly in Babel's documentation
 * (https://babeljs.io/docs/en/configuration#how-babel-merges-config-items),
 * but while poking in Babel's internals, we found that overrides get prepended
 * to any preset's overrides. For instance:
 *
 *   ```json
 *   {
 *     "presets": ["metro-react-native-babel-preset"],
 *     "overrides": {
 *       "plugins": [
 *         ["@babel/plugin-transform-classes", { "loose": true }]
 *       ]
 *     }
 *   }
 *   ```
 *
 * Turns into:
 *
 *   ```json
 *   {
 *     "plugins": [
 *       ["@babel/plugin-transform-classes", { "loose": true }],
 *       // other plugin overrides by `metro-react-native-babel-preset` here
 *     ]
 *   }
 *   ```
 *
 * This means that we cannot override `metro-react-native-babel-preset` using
 * the `overrides` field. Luckily, it does export a `getPreset()` function that
 * we can call and modify the config.
 *
 * @type {(api?: ConfigAPI, opts?: PresetOptions) => TransformOptions}
 */
module.exports = (
  _,
  {
    additionalPlugins,
    looseClassTransform,
    unstable_transformProfile,
    ...options
  } = {}
) => {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  const metroPreset = getPreset(null, {
    ...(options.withDevTools == null
      ? { dev: env !== "production" }
      : undefined),
    ...options,
    ...overridesFor(unstable_transformProfile),
  });
  const overrides = metroPreset.overrides;

  overrides.push({
    test: /\.tsx?$/,
    plugins: [
      ...constEnumPlugin(),
      ...(Array.isArray(additionalPlugins) ? additionalPlugins : []),
    ],
  });

  if (looseClassTransform) {
    overrides.push({
      plugins: [["@babel/plugin-transform-classes", { loose: true }]],
    });
  }

  return metroPreset;
};
