const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  CyclicDependencies,
} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
const {
  DuplicateDependencies,
} = require("@rnx-kit/metro-plugin-duplicates-checker");
const {
  MetroSerializer,
  esbuildTransformerConfig,
} = require("@rnx-kit/metro-serializer-esbuild");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  serializer: {
    customSerializer: MetroSerializer([
      CyclicDependencies(),
      DuplicateDependencies({ ignoredModules: ["react-is"] }),
    ]),
  },
  transformer: esbuildTransformerConfig,
});
