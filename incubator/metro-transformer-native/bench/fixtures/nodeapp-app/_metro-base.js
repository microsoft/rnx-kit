// Shared Metro-config helpers used by every `metro.config.*.js` in this
// fixture. Keeps the per-scenario configs focused on the *one* axis they
// differ on (transformer / serializer / options).

const path = require("node:path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..", "..", "..", "..", "..");

const fromMetro = { paths: [require.resolve("metro/package.json")] };
const metroDir = path.dirname(fromMetro.paths[0]);
const metroRuntimeDir = path.dirname(
  require.resolve("metro-runtime/package.json", fromMetro)
);

// nodeapp authors a mix of .ts/.mts/.cjs/.mjs source. Metro's default
// `sourceExts` does NOT include .cjs or .mjs, so we extend it here.
const sourceExts = ["js", "mjs", "cjs", "jsx", "json", "ts", "tsx"];

const resolverDefaults = {
  sourceExts,
  nodeModulesPaths: [path.join(repoRoot, "node_modules")],
  extraNodeModules: { "metro-runtime": metroRuntimeDir },
  // Enable Node's exports map so @rnx-kit/test-fixtures/nodeapp resolves
  // through the package's `"./nodeapp"` export entry. This is on by
  // default in modern Metro but we set it explicitly for clarity.
  unstable_enablePackageExports: true,
};

function baseConfig() {
  return {
    projectRoot,
    watchFolders: [repoRoot, metroDir],
    resolver: { ...resolverDefaults },
    serializer: {
      getPolyfills: () => [],
      getModulesRunBeforeMainModule: () => [],
    },
    cacheStores: [],
    reporter: { update: () => null },
  };
}

module.exports = {
  projectRoot,
  repoRoot,
  metroDir,
  metroRuntimeDir,
  sourceExts,
  baseConfig,
};
