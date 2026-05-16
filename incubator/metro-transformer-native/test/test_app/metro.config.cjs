// Metro config for the test_app harness. Reads the bundle options from the
// environment (see options.mts) so a single config file serves all permutations
// the runner iterates over.

const path = require("node:path");

// Read the bundle options directly from the environment. Keep this in sync
// with options.mts (`ENV_OPTIONS` / `defaultOptions`). We can't `require()`
// the .mts file from a .cjs config without juggling both --experimental-
// strip-types and require(esm) flags, so we inline the env protocol here.
const ENV_OPTIONS = "RNX_NODEAPP_TEST_OPTIONS";
const envRaw = process.env[ENV_OPTIONS];
const envOpts = envRaw ? JSON.parse(envRaw) : {};
const options = {
  dev: false,
  minify: false,
  treeShake: false,
  esbuild: false,
  ...envOpts,
};

// Map of `node:xxx` specifier → on-disk shim file. The shim re-exports the
// real Node built-in at runtime. We need the indirection because Metro tries
// to resolve every `import` against the project's node_modules tree, which
// does NOT contain Node built-ins.
const nodeShimDir = path.join(__dirname, "node-shims");
const nodeBuiltinShims = {
  "node:fs": path.join(nodeShimDir, "fs.js"),
  "node:fs/promises": path.join(nodeShimDir, "fs__promises.js"),
  "node:path": path.join(nodeShimDir, "path.js"),
  "node:process": path.join(nodeShimDir, "process.js"),
  "node:url": path.join(nodeShimDir, "url.js"),
};

function resolveNodeBuiltin(context, moduleName, platform) {
  const shim = nodeBuiltinShims[moduleName];
  if (shim) {
    return { type: "sourceFile", filePath: shim };
  }
  // Defer to Metro's default resolver.
  return context.resolveRequest(context, moduleName, platform);
}

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "..", "..", "..", "..");

// Resolve metro-runtime relative to metro's own node_modules so we don't
// require the consumer to install metro-runtime explicitly.
const fromMetro = { paths: [require.resolve("metro/package.json")] };
const metroDir = path.dirname(fromMetro.paths[0]);
const metroRuntimeDir = path.dirname(
  require.resolve("metro-runtime/package.json", fromMetro)
);

// Resolve @babel/runtime explicitly. The stock RN transformer emits requires
// like `@babel/runtime/helpers/...` which must be resolvable in the project's
// module graph. We declare @babel/runtime as a devDependency so this resolve
// succeeds in CI and locally.
const babelRuntimeDir = path.dirname(
  require.resolve("@babel/runtime/package.json")
);

// nodeapp authors a mix of .ts/.js/.cjs/.mjs source. Metro's default
// `sourceExts` does NOT include .cjs or .mjs, so we extend it here.
const sourceExts = ["js", "mjs", "cjs", "jsx", "json", "ts", "tsx"];

const { esbuild, treeShake, minify, transformer: transformerOptions } = options;

// Base transformer slice. When the esbuild serializer is requested we apply
// `esbuildTransformerConfig` so Metro emits ESM that esbuild can tree-shake.
let baseTransformerConfig = {};
if (esbuild) {
  const {
    esbuildTransformerConfig,
  } = require("@rnx-kit/metro-serializer-esbuild");
  baseTransformerConfig = { ...esbuildTransformerConfig };
}

// If `transformer` options are supplied, wire up MetroTransformerNative.
// Otherwise default to @react-native/metro-babel-transformer (Metro's stock
// generic `metro-babel-transformer` doesn't handle TypeScript). This is the
// baseline permutation.
let transformer;
if (transformerOptions) {
  const { MetroTransformerNative } = require("../../lib/index.js");
  transformer = MetroTransformerNative(
    transformerOptions,
    baseTransformerConfig
  );
} else {
  transformer = {
    ...baseTransformerConfig,
    babelTransformerPath:
      require.resolve("@react-native/metro-babel-transformer"),
  };
}

// The esbuild serializer needs an asset registry path even though nodeapp
// doesn't load any assets. Use react-native's path from the repo root.
if (esbuild) {
  transformer = {
    ...transformer,
    assetRegistryPath: path.join(repoRoot, "node_modules", "react-native"),
    // Metro must keep import/export intact for esbuild's tree-shaker.
    experimentalImportSupport: true,
  };
}

let serializer = {
  // Empty polyfills — the test_app harness doesn't need them, and skipping
  // them keeps the bundle small and the bundle build fast.
  getPolyfills: () => [],
  getModulesRunBeforeMainModule: () => [],
};

if (esbuild) {
  const { MetroSerializer } = require("@rnx-kit/metro-serializer-esbuild");
  serializer = {
    ...serializer,
    customSerializer: MetroSerializer([], { treeShake, minify }),
  };
}

/** @type {import("metro-config").InputConfigT} */
module.exports = {
  projectRoot,
  // Watch the repo root so Metro can resolve workspace dependencies through
  // the symlinked node_modules tree, and metro's own dir for metro-runtime.
  watchFolders: [repoRoot, metroDir],
  resolver: {
    sourceExts,
    nodeModulesPaths: [path.join(repoRoot, "node_modules")],
    extraNodeModules: {
      "metro-runtime": metroRuntimeDir,
      "@babel/runtime": babelRuntimeDir,
    },
    resolveRequest: resolveNodeBuiltin,
    // Enable Node's exports map so @rnx-kit/test-fixtures/nodeapp/cli resolves
    // through the package's `"./nodeapp/cli"` export entry.
    unstable_enablePackageExports: true,
  },
  transformer,
  serializer,
  // Disable cache stores so consecutive bundle runs don't interfere with each
  // other and we always measure a fresh bundle.
  cacheStores: [],
  reporter: { update: () => null },
};
