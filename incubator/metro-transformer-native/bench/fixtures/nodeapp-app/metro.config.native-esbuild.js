// Native transformer + @rnx-kit/metro-serializer-esbuild. Tests the
// ESM-preserving path that's required for esbuild's tree-shaker to work.
// handleModules MUST stay false here (Metro warns otherwise).

const { MetroSerializer } = require("@rnx-kit/metro-serializer-esbuild");
const { MetroTransformerNative } = require("../../../lib/index.js");
const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = {
  ...MetroTransformerNative(
    { nativeTransform: true, handleTs: true, handleModules: false },
    {}
  ),
  // esbuild serializer needs an asset registry path even though we
  // don't actually load any assets in nodeapp.
  assetRegistryPath: require("node:path").join(
    require("./_metro-base.js").repoRoot,
    "node_modules",
    "react-native"
  ),
};
// experimentalImportSupport must be on so Metro leaves import/export
// statements intact for esbuild to analyze.
base.transformer.experimentalImportSupport = true;
base.serializer = {
  ...base.serializer,
  customSerializer: MetroSerializer([], { minify: false }),
};
module.exports = base;
