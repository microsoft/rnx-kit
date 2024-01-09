const {
  exclusionList,
  makeMetroConfig,
  resolveUniqueModule,
} = require("@rnx-kit/metro-config");
const path = require("node:path");
const { MetroSerializer, esbuildTransformerConfig } = require(".");

// Metro will pick up mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*package.json/]);

// We can't install dependencies for our test fixtures so we need to resolve
// them here to help Metro find them.
function resolveFixtureDependencies() {
  const [fluentUtils] = resolveUniqueModule("@fluentui/utilities");
  const [fluentDomUtils] = resolveUniqueModule(
    "@fluentui/dom-utilities",
    fluentUtils
  );
  const [fluentMergeStyles] = resolveUniqueModule(
    "@fluentui/merge-styles",
    fluentUtils
  );
  const [fluentSetVersion] = resolveUniqueModule(
    "@fluentui/set-version",
    fluentUtils
  );
  const [lodash] = resolveUniqueModule("lodash-es");
  const [metroRuntime] = resolveUniqueModule(
    "metro-runtime",
    require.resolve("metro/package.json")
  );
  const [tslib] = resolveUniqueModule("tslib", fluentUtils);
  return {
    "@fluentui/dom-utilities": fluentDomUtils,
    "@fluentui/merge-styles": fluentMergeStyles,
    "@fluentui/set-version": fluentSetVersion,
    "@fluentui/utilities": fluentUtils,
    "lodash-es": lodash,
    "metro-runtime": metroRuntime,
    tslib,
  };
}

module.exports = makeMetroConfig({
  reporter: { update: () => undefined },
  resetCache: true,
  resolver: {
    resolverMainFields: ["react-native", "module", "browser", "main"],
    extraNodeModules: resolveFixtureDependencies(),
    blacklistRE: blockList,
    blockList,
  },
  serializer: {
    customSerializer: MetroSerializer([], { minify: false }),
    getPolyfills: () => [],
  },
  transformer: esbuildTransformerConfig,
  watchFolders: [path.resolve("../../node_modules/.store")],
});
