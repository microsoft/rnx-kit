// Native transformer with handleModules:true — SWC emits CommonJS.
// Loses ESM tree-shake but exercises Metro's standard module-wrapping path.

const { MetroTransformerNative } = require("../../../lib/index.js");
const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = MetroTransformerNative(
  {
    nativeTransform: true,
    handleTs: true,
    handleJs: true,
    handleModules: true,
  },
  {}
);
module.exports = base;
