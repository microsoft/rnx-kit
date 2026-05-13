// Metro config that combines @rnx-kit/metro-transformer-native with
// @rnx-kit/metro-serializer-esbuild. This is the configuration the
// real-app interop test (Task 5.3) exercises to prove that the native
// transformer plays nicely with esbuild's tree-shaking pass.

const path = require("node:path");
const { MetroTransformerNative } = require("../../../lib/index.js");
const {
  MetroSerializer,
} = require("@rnx-kit/metro-serializer-esbuild");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..", "..", "..", "..", "..");

// NOTE: `@rnx-kit/metro-serializer-esbuild` looks up Metro via
// `findMetroPath(process.cwd())` (walks react-native → @react-native-community/cli
// → metro). The shim itself has none of those, so bench/bundle-esbuild.ts
// pivots `process.cwd()` to a directory that does — the metro-serializer-esbuild
// package — BEFORE loading this config. The bundle's projectRoot remains SHIM_DIR.

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
    // IMPORTANT: handleModules MUST be false (the default) here. The
    // native transformer warns if you combine handleModules:true with
    // the esbuild serializer — emitting CommonJS would defeat the
    // tree-shake pass entirely.
    ...MetroTransformerNative(
      { nativeTransform: true, handleTs: true, handleModules: false },
      {}
    ),
    assetRegistryPath: path.join(repoRoot, "node_modules", "react-native"),
  },
  serializer: {
    customSerializer: MetroSerializer([], { minify: false }),
    getPolyfills: () => [],
    getModulesRunBeforeMainModule: () => [],
  },
  cacheStores: [],
  reporter: { update: () => null },
};
