/* jshint esversion: 8, node: true */

// This patch can be removed after Metro PR https://github.com/facebook/metro/pull/701
// is merged, published, and updated in our repo.

/** @type {string[] | undefined} */
let roots = undefined;

/**
 * Get the current set of Metro roots. These are patched-in during
 * Metro bundling or serving.
 *
 * @returns Array of package root paths, or `undefined` if no roots are set.
 */
function getMetroRoots() {
  // Ensure that package roots are specified.
  if (!roots) {
    throw new Error("Package root paths were not specified");
  }
  return roots;
}

/**
 * Set the array of package root paths to patch-in during Metro bundling
 * or serving.
 *
 * @param {string[]} rootsArg Array of package root paths
 */
function setMetroRoots(rootsArg) {
  roots = rootsArg;
}

/**
 * Hook Metro's `DependencyGraph._createHaste(metroConfig, watch [bool])` function.
 *
 * This function is where Metro creates a `JestHasteMap` which finds and loads
 * packages. One of the haste-map init props is the array of package root paths.
 * These control where the haste-map can search.
 *
 * Metro currently sets the package root paths to `metroConfig.watchFolders`.
 * This patch overrides that, using package root paths from `getMetroRoots()`.
 */
// eslint-disable-next-line
// @ts-ignore
const DependencyGraph = require("metro/src/node-haste/DependencyGraph");

const origCreateHaste = DependencyGraph._createHaste.bind(DependencyGraph);
DependencyGraph._createHaste = (
  /** @type {Record<string, unknown>} */ config,
  /** @type {boolean} */ watch
) => {
  const updatedConfig = {
    ...config,
    watchFolders: getMetroRoots(),
  };
  return origCreateHaste(updatedConfig, watch);
};

/**
 * Hook Metro's `Assets.getAsset(...)` function.
 *
 * This funtion is where Metro loads and returns the contents of an asset file.
 * It limits the asset files it will load. It only allows files in the current
 * project and in any of the `watchFolders` (metro config property).
 *
 * This patch replaces `watchFolders` with package root paths from `getMetroRoots()`.
 */
// eslint-disable-next-line
// @ts-ignore
const Assets = require("metro/src/Assets");

const origGetAsset = Assets.getAsset;
Assets.getAsset = async (
  /** @type {unknown} */
  relativePath,
  /** @type {unknown} */
  projectRoot,
  /** @type {unknown} */
  _watchFolders,
  /** @type {unknown} */
  platform,
  /** @type {unknown} */
  assetsExt
) => {
  return origGetAsset(
    relativePath,
    projectRoot,
    getMetroRoots(),
    platform,
    assetsExt
  );
};

module.exports = {
  getMetroRoots,
  setMetroRoots,
};
