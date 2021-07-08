const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  esbuildTransformerConfig,
} = require("@rnx-kit/metro-serializer-esbuild");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  transformer: esbuildTransformerConfig,
});
