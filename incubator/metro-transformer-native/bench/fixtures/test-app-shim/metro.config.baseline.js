// Metro config that uses @react-native/metro-babel-transformer (the
// upstream RN default) for the same shim project. Used by
// bench/bundle-compare.ts to produce a reference bundle for the diff.

const path = require("node:path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..", "..", "..", "..", "..");

const fromMetro = { paths: [require.resolve("metro/package.json")] };
const metroRuntimeDir = path.dirname(
  require.resolve("metro-runtime/package.json", fromMetro)
);
const extraNodeModules = {
  "metro-runtime": metroRuntimeDir,
};

/** @type {import("metro-config").InputConfigT} */
module.exports = {
  projectRoot,
  watchFolders: [repoRoot, path.dirname(fromMetro.paths[0])],
  resolver: {
    extraNodeModules,
    nodeModulesPaths: [path.join(repoRoot, "node_modules")],
  },
  transformer: {
    babelTransformerPath: require.resolve(
      "@react-native/metro-babel-transformer"
    ),
  },
  serializer: {
    getPolyfills: () => [],
    getModulesRunBeforeMainModule: () => [],
  },
  cacheStores: [],
  reporter: { update: () => null },
};
