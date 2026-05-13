// Metro config for the bench shim app. Uses @rnx-kit/metro-transformer-native
// via the same MetroTransformerNative() factory consumers would call.

const path = require("node:path");
const { MetroTransformerNative } = require("../../../lib/index.js");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..", "..", "..", "..", "..");

// Resolve metro-runtime relative to metro's own node_modules so we don't
// require the consumer to install metro-runtime explicitly.
const fromMetro = { paths: [require.resolve("metro/package.json")] };
// Metro's resolver only consults `extraNodeModules` by *package name*
// (the first path segment of the specifier), and then appends the rest of
// the subpath. So we map the package name `metro-runtime` to the on-disk
// package directory we resolved from metro's own node_modules.
const metroRuntimeDir = path.dirname(
  require.resolve("metro-runtime/package.json", fromMetro)
);
const extraNodeModules = {
  "metro-runtime": metroRuntimeDir,
};

/** @type {import("metro-config").InputConfigT} */
module.exports = {
  projectRoot,
  // Watch the repo root so Metro can resolve our workspace dependencies
  // via the symlinked node_modules tree.
  watchFolders: [repoRoot, path.dirname(fromMetro.paths[0])],
  resolver: {
    extraNodeModules,
    nodeModulesPaths: [path.join(repoRoot, "node_modules")],
  },
  transformer: MetroTransformerNative(
    { nativeTransform: true, handleTs: true },
    {}
  ),
  serializer: {
    // Empty polyfills — the bench shim doesn't need them, and skipping
    // them keeps the bundle small and the runBuild fast.
    getPolyfills: () => [],
    getModulesRunBeforeMainModule: () => [],
  },
  // Disable cache stores so consecutive bench runs don't interfere with
  // each other and we always measure a fresh bundle.
  cacheStores: [],
  reporter: { update: () => null },
};
