/* jshint esversion: 8, node: true */
// @ts-check
"use strict";
const path = require("path");

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
 * Converts version string to a number.
 * @param {string} version
 * @returns {number}
 */
function parseVersion(version) {
  const [major, minor = 0] = version.split(".");
  return Number(major) * 1000 + Number(minor);
}

/**
 * @param {string} id
 * @param {Required<TransformOptions>["overrides"]} overrides
 * @param {string} startDir
 * @return {PluginItem | undefined}
 */
function findBabelPlugin(id, overrides, startDir) {
  const plugin = require(require.resolve(id, { paths: [startDir] }));
  for (const override of overrides) {
    const entry = override.plugins?.find((p) => {
      return Array.isArray(p) ? p[0] === plugin : p === plugin;
    });
    if (entry) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Returns whether Babel implements compiler assumptions.
 * @param {ConfigAPI | undefined} api
 * @returns {boolean}
 */
function hasCompilerAssumptions(api) {
  return Boolean(api?.version && parseVersion(api.version) >= 7013);
}

/**
 * Configures `@babel/plugin-transform-classes` to emit less code for classes.
 * Useful if you're using TypeScript and want to avoid additional checks.
 * @param {Required<TransformOptions>} preset
 * @param {string} babelPreset
 * @param {ConfigAPI | undefined} api
 */
function configurePluginTransformClasses(preset, babelPreset, api) {
  if (hasCompilerAssumptions(api)) {
    const { warn } = require("@rnx-kit/console");
    warn(
      "`looseClassTransform` is deprecated — consider migrating to the top level assumptions for more granular control (see https://babeljs.io/docs/babel-plugin-transform-classes#loose)"
    );
  }

  const plugin = findBabelPlugin(
    "@babel/plugin-transform-classes",
    preset.overrides,
    babelPreset
  );
  if (Array.isArray(plugin)) {
    plugin[1] = { loose: true };
  }
}

/**
 * Configures `@babel/plugin-transform-runtime` to ensure it works in a pnpm
 * environment.
 * @param {Required<TransformOptions>} preset
 * @param {string} babelPreset
 */
function configurePluginTransformRuntime(preset, babelPreset) {
  const plugin = findBabelPlugin(
    "@babel/plugin-transform-runtime",
    preset.overrides,
    babelPreset
  );
  if (Array.isArray(plugin)) {
    const runtime = require.resolve("@babel/runtime/package.json");
    plugin[1].absoluteRuntime = path.dirname(runtime);
  }
}

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
    if (parseVersion(version) >= 7015) {
      return [];
    }
  } catch (_) {
    // assume we need `const-enum`
  }

  return [require.resolve("babel-plugin-const-enum")];
}

function loadPreset(projectRoot = process.cwd()) {
  const fs = require("fs");

  const manifestPath = path.join(projectRoot, "package.json");
  const manifest = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const isTesting = manifest.includes(
    '"name": "@rnx-kit/babel-preset-metro-react-native"'
  );

  const options = { paths: [projectRoot] };
  const babelPreset =
    manifest.includes("@react-native/babel-preset") && !isTesting
      ? require.resolve("@react-native/babel-preset", options) // >=0.73
      : require.resolve("metro-react-native-babel-preset", options);

  const { getPreset } = require(babelPreset);
  return [getPreset, babelPreset];
}

/**
 * Returns additional options for `metro-react-native-babel-preset`.
 * @param {string | undefined} transformProfile
 * @param {string | undefined} env
 * @returns {MetroPresetOptions | undefined}
 */
function overridesFor(transformProfile, env) {
  // Use the `esbuild` transform profile if the serializer is being used.
  if (
    !transformProfile &&
    env === "production" &&
    process.env["RNX_METRO_SERIALIZER_ESBUILD"]
  ) {
    transformProfile = "esbuild";
  }

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
  api,
  {
    additionalPlugins,
    looseClassTransform,
    unstable_transformProfile,
    ...options
  } = {}
) => {
  const env = process.env.BABEL_ENV || process.env.NODE_ENV;
  const [getPreset, babelPreset] = loadPreset();
  const metroPreset = getPreset(null, {
    ...(options.withDevTools == null
      ? { dev: env !== "production" }
      : undefined),
    ...overridesFor(unstable_transformProfile, env),
    ...options,
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
    configurePluginTransformClasses(metroPreset, babelPreset, api);
  }
  if (options?.enableBabelRuntime !== false) {
    configurePluginTransformRuntime(metroPreset, babelPreset);
  }

  return metroPreset;
};
