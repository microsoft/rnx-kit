/* jshint esversion: 8, node: true */
// @ts-check

/**
 * @typedef {{
 *   transform: {
 *     experimentalImportSupport?: boolean;
 *     inlineRequires?: boolean;
 *     unstable_disableES6Transforms?: boolean;
 *   },
 *   preloadedModules?: boolean;
 *   ramGroups?: string[];
 * }} MetroTransformOptions;
 *
 * @typedef {{
 *   projectRoot?: string;
 *   resetCache?: boolean;
 *   resolver?: {
 *     blacklistRE?: RegExp;
 *     blockList?: RegExp;
 *     [key: string]: unknown;
 *   },
 *   transformer?: {
 *     getTransformOptions: () => Promise<MetroTransformOptions>;
 *     [key: string]: unknown;
 *   }
 *   watchFolders?: string[];
 *   [key: string]: unknown;
 * }} MetroConfig;
 */

/**
 * A minimum list of folders that should be watched by Metro.
 * @param {string | undefined} projectRoot
 * @returns {string[]}
 */
function defaultWatchFolders(projectRoot) {
  const findUp = require("find-up");
  const path = require("path");

  // If `projectRoot` is not set, assume that `@rnx-kit/metro-config` lives in
  // the same monorepo as the target package.
  const thisPackage =
    projectRoot || path.dirname(findUp.sync("package.json") || "");
  const rootPackage = findUp.sync("package.json", {
    cwd: path.dirname(thisPackage),
  });

  if (!rootPackage) {
    return [];
  }

  // In a monorepo, in particular when using Yarn workspaces, packages are
  // symlinked in the root `node_modules` folder so it needs to be watched.
  const watchFolders = ["node_modules"];

  const rootPath = path.dirname(rootPackage);
  const manifest = require(rootPackage);
  if (manifest.workspaces && manifest.workspaces.packages) {
    const fg = require("fast-glob");
    watchFolders.push(
      ...fg.sync(manifest.workspaces.packages, {
        cwd: rootPath,
        onlyDirectories: true,
        unique: true,
      })
    );
  }

  return watchFolders.map((p) => path.join(rootPath, p));
}

/**
 * Helper function for generating a package exclusion list.
 * @param {(string | RegExp)[]=} additionalExclusions
 * @returns {RegExp}
 */
function exclusionList(additionalExclusions = []) {
  const exclusionList = (() => {
    try {
      // @ts-ignore There are no type definition files for `metro-config`
      return require("metro-config/src/defaults/exclusionList");
    } catch (_) {
      // `blacklist` was renamed to `exclusionList` in 0.60
      // @ts-ignore There are no type definition files for `metro-config`
      return require("metro-config/src/defaults/blacklist");
    }
  })();

  return exclusionList([
    // Ignore nested copies of react-native
    /node_modules\/.*\/node_modules\/react-native\/.*/,

    // Workaround for `EBUSY: resource busy or locked, open '~\msbuild.ProjectImports.zip'`
    // when building with `yarn windows --release`
    /.*\.ProjectImports\.zip/,

    ...additionalExclusions,
  ]);
}

const blockList = exclusionList();

module.exports = {
  defaultWatchFolders,
  exclusionList,

  /**
   * Helper function for configuring Babel.
   * @param {string[]=} additionalPlugins
   * @returns {import("@babel/core").TransformOptions}
   */
  makeBabelConfig: (additionalPlugins = []) => {
    return {
      presets: ["module:metro-react-native-babel-preset"],
      overrides: [
        {
          test: /\.tsx?$/,
          plugins: [
            // @babel/plugin-transform-typescript doesn't support `const enum`s.
            // See https://babeljs.io/docs/en/babel-plugin-transform-typescript#caveats
            // for more details.
            "const-enum",

            ...additionalPlugins,
          ],
        },
      ],
    };
  },

  /**
   * Helper function for configuring Metro.
   * @param {MetroConfig=} customConfig
   * @returns {MetroConfig}
   */
  makeMetroConfig: (customConfig = {}) => {
    // @ts-ignore There are no type definition files for `metro-config`
    const { mergeConfig } = require("metro-config");
    return mergeConfig(
      {
        resolver: {
          blacklistRE: blockList, // For Metro < 0.60
          blockList, // For Metro >= 0.60
        },
        transformer: {
          getTransformOptions: async () => ({
            transform: {
              experimentalImportSupport: false,
              inlineRequires: false,
            },
          }),
        },
        watchFolders: defaultWatchFolders(customConfig.projectRoot),
      },
      customConfig
    );
  },
};
