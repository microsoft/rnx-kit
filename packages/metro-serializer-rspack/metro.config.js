const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("node:path");
const { MetroSerializer, rspackTransformerConfig } = require(".");

// Metro will pick up mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*package.json/]);

// We can't install dependencies for our test fixtures so we need to resolve
// them here to help Metro find them.
const extraNodeModules = (() => {
  const fromMetro = { paths: [require.resolve("metro/package.json")] };
  return {
    "metro-runtime/src/modules/asyncRequire.js": require.resolve(
      "metro-runtime/src/modules/asyncRequire.js",
      fromMetro
    ),
    "metro-runtime/src/polyfills/require.js": require.resolve(
      "metro-runtime/src/polyfills/require.js",
      fromMetro
    ),
    react: require.resolve("react"),
  };
})();

module.exports = makeMetroConfig({
  reporter: { update: () => undefined },
  resetCache: true,
  resolver: {
    resolverMainFields: ["react-native", "module", "browser", "main"],
    extraNodeModules,
    blacklistRE: blockList,
    blockList,
  },
  serializer: {
    customSerializer: MetroSerializer([], { minify: false }),
    getPolyfills: () => [],
  },
  transformer: rspackTransformerConfig,
  watchFolders: Object.values(extraNodeModules).map((dir) => path.dirname(dir)),
});
