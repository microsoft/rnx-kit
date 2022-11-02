const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");
const { MetroSerializer, esbuildTransformerConfig } = require(".");

// Metro will pick up mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*package.json/]);

module.exports = makeMetroConfig({
  reporter: { update: () => undefined },
  resetCache: true,
  resolver: {
    resolverMainFields: ["react-native", "module", "browser", "main"],
    blacklistRE: blockList,
    blockList,
  },
  serializer: {
    customSerializer: MetroSerializer([], {
      minify: false,
    }),
    getPolyfills: () => [],
  },
  transformer: esbuildTransformerConfig,
});
