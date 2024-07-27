const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");
const path = require("node:path");
const { MetroSerializer, esbuildTransformerConfig } = require(".");

// Metro will pick up mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*package.json/]);

// We can't install dependencies for our test fixtures so we need to resolve
// them here to help Metro find them.
const extraNodeModules = (() => {
  const fluentUtils = require
    .resolve("@fluentui/utilities")
    .replace("lib-commonjs", "lib");
  const fromFluentUtils = { paths: [fluentUtils] };
  const resolveFromFluent = (name) =>
    require.resolve(name, fromFluentUtils).replace("lib-commonjs", "lib");

  const fromMetro = { paths: [require.resolve("metro/package.json")] };

  return {
    "@fluentui/dom-utilities": resolveFromFluent("@fluentui/dom-utilities"),
    "@fluentui/merge-styles": resolveFromFluent("@fluentui/merge-styles"),
    "@fluentui/set-version": resolveFromFluent("@fluentui/set-version"),
    "@fluentui/utilities": fluentUtils,
    "lodash-es": require.resolve("lodash-es"),
    "metro-runtime/src/modules/asyncRequire.js": require.resolve(
      "metro-runtime/src/modules/asyncRequire.js",
      fromMetro
    ),
    "metro-runtime/src/polyfills/require.js": require.resolve(
      "metro-runtime/src/polyfills/require.js",
      fromMetro
    ),
    react: require.resolve("react"),
    tslib: require.resolve("tslib", fromFluentUtils),
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
  transformer: esbuildTransformerConfig,
  watchFolders: Object.values(extraNodeModules).map((dir) => path.dirname(dir)),
});
