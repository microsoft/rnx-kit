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
 *     extraNodeModules?: Record<string, string>;
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

/** Packages that must be resolved to one specific copy. */
const UNIQUE_PACKAGES = ["react", "react-native"];

/**
 * A minimum list of folders that should be watched by Metro.
 * @param {string | undefined} projectRoot
 * @returns {string[]}
 */
function defaultWatchFolders(projectRoot) {
  const findUp = require("find-up");
  const path = require("path");
  const {
    getAllPackageJsonFiles,
    getWorkspaceRoot,
  } = require("workspace-tools");

  // If `projectRoot` is not set, assume that `@rnx-kit/metro-config` lives in
  // the same monorepo as the target package.
  const thisPackage = path.dirname(
    findUp.sync("package.json", { cwd: projectRoot }) || ""
  );

  try {
    const root = getWorkspaceRoot(thisPackage);
    if (!root) {
      return [];
    }

    const packages = getAllPackageJsonFiles(thisPackage);
    if (!Array.isArray(packages) || packages.length === 0) {
      return [];
    }

    // In a monorepo, in particular when using Yarn workspaces, packages are
    // symlinked in the root `node_modules` folder so it needs to be watched.
    return [
      path.join(root, "node_modules"),
      ...packages.map((pkg) => path.dirname(pkg)),
    ];
  } catch (_) {
    return [];
  }
}

/**
 * Returns the path to specified module; `undefined` if not found.
 *
 * Note that this function ignores symlinks. When creating rules to
 * exclude extra copies, Metro will be unable to resolve packages
 * because it doesn't resolve symlinks and all real paths are excluded.
 *
 * @param {string} name
 * @param {string=} projectRoot
 * @returns {string | undefined}
 */
function resolveModule(name, projectRoot) {
  const findUp = require("find-up");
  const path = require("path");

  return findUp.sync(path.join("node_modules", name), {
    cwd: projectRoot,
    type: "directory",
    allowSymlinks: false,
  });
}

/**
 * Returns a regex to exclude extra copies of specified package.
 *
 * Note that when using this function to exclude packages, you should also add
 * the path to the correct copy in `extraNodeModules` so Metro can resolve them
 * when referenced from modules that are siblings of the module that has them
 * installed.
 *
 * @see exclusionList for further information.
 *
 * @param {string} packageName
 * @param {string=} projectRoot
 * @returns {RegExp}
 */
function excludeExtraCopiesOf(packageName, projectRoot) {
  const result = resolveModule(packageName, projectRoot);
  if (!result) {
    throw new Error(`Failed to find '${packageName}'`);
  }

  const path = require("path");
  const findUp = require("find-up");

  // Find the node_modules folder and account for cases when packages are
  // nested within workspace folders. Examples:
  // - path/to/node_modules/@babel/runtime
  // - path/to/node_modules/prop-types
  const nodeModules = findUp.sync("node_modules", {
    cwd: path.dirname(result),
    type: "directory",
    allowSymlinks: false,
  });

  if (!nodeModules) {
    throw new Error(`Couldn't resolve the node_modules folder for ${result}`);
  }

  const owningDir = path.dirname(nodeModules);
  const escapedPath = owningDir.replace(/\\/g, "\\\\");
  const escapedPackageName = packageName.replace(/\\/g, "\\\\");

  return new RegExp(
    `(?<!${escapedPath})[\\/\\\\]node_modules[\\/\\\\]${escapedPackageName}[\\/\\\\].*`
  );
}

/**
 * Helper function for generating a package exclusion list.
 *
 * One of the most important things this function does is to exclude extra
 * copies of packages that cannot have duplicates, e.g. `react` and
 * `react-native`. But with how Metro currently resolves modules, some packages
 * will not be able to find them if a local copy exists. For instance, in the
 * below scenario, Metro cannot resolve `react-native` in
 * `another-awesome-package` because it does not look in `my-awesome-package`.
 * To help Metro, we will also need to add a corresponding entry to
 * `extraNodeModules`.
 *
 *     workspace
 *     ├── node_modules
 *     │   └── react-native@0.62.2  <-- should be ignored
 *     └── packages
 *         ├── my-awesome-package
 *         │   └── node_modules
 *         │       └── react-native@0.61.5  <-- should take precedence
 *         └── another-awesome-package  <-- imported by my-awesome-package,
 *                                          but uses workspace's react-native
 *
 * @param {(string | RegExp)[]=} additionalExclusions
 * @param {string=} projectRoot
 * @returns {RegExp}
 */
function exclusionList(additionalExclusions = [], projectRoot = process.cwd()) {
  /** @type {(additionalExclusions: (string | RegExp)[]) => RegExp} */
  const exclusionList = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore There are no type definition files for `metro-config`
      return require("metro-config/src/defaults/exclusionList");
    } catch (_) {
      // `blacklist` was renamed to `exclusionList` in 0.60
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore There are no type definition files for `metro-config`
      return require("metro-config/src/defaults/blacklist");
    }
  })();

  return exclusionList([
    ...UNIQUE_PACKAGES.map((name) => excludeExtraCopiesOf(name, projectRoot)),

    // Workaround for `EBUSY: resource busy or locked, open '~\msbuild.ProjectImports.zip'`
    // when building with `yarn windows --release`
    /.*\.ProjectImports\.zip/,

    ...additionalExclusions,
  ]);
}

module.exports = {
  UNIQUE_PACKAGES,

  defaultWatchFolders,
  excludeExtraCopiesOf,
  exclusionList,

  /**
   * Helper function for configuring Metro.
   * @param {MetroConfig=} customConfig
   * @returns {MetroConfig}
   */
  makeMetroConfig: (customConfig = {}) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore There are no type definition files for `metro-config`
    const { mergeConfig } = require("metro-config");

    const projectRoot = customConfig.projectRoot || process.cwd();
    const blockList = exclusionList([], projectRoot);
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
      {
        ...customConfig,
        resolver: {
          ...customConfig.resolver,
          extraNodeModules: {
            /**
             * Ensure that Metro is able to resolve packages that cannot be
             * duplicated.
             * @see exclusionList for further information.
             */
            ...UNIQUE_PACKAGES.reduce((extraModules, name) => {
              const resolvedPath = resolveModule(name, projectRoot);
              if (resolvedPath) {
                extraModules[name] = resolvedPath;
              }
              return extraModules;
            }, /** @type Record<string, string> */ ({})),
            ...(customConfig.resolver
              ? customConfig.resolver.extraNodeModules
              : {}),
          },
        },
      }
    );
  },
};
