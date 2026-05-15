const { getEnvOptions } = require("./options.mts");
const MetroTransformerNative =
  require("../../src/index.ts").MetroTransformerNative;
const {
  MetroSerializer,
  esbuildTransformerConfig,
} = require("@rnx-kit/metro-serializer-esbuild");

const options = getEnvOptions();
const {
  treeShake,
  minify,
  esbuild,
  transformer: transformerOptions,
} = options || {};

const baseTransformSettings = treeShake ? esbuildTransformerConfig : {};

const serializerMixin = esbuild
  ? // oxlint-disable-next-line unicorn/no-useless-spread
    { serializer: MetroSerializer(undefined, { treeShake, minify }) }
  : {};

module.exports = makeMetroConfig({
  resolver: {
    sourceExts: ["js", "mjs", "cjs", "jsx", "json", "ts", "tsx"],
    resolveRequest: MetroSymlinksResolver({}),
    unstable_enablePackageExports: true,
  },
  transformer: transformerOptions
    ? MetroTransformerNative(transformerOptions, baseTransformSettings)
    : baseTransformSettings,
  ...serializerMixin,
});
