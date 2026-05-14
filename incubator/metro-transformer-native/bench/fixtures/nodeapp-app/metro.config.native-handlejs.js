// Native transformer with handleJs:true — SWC processes .js/.jsx too,
// not just .ts/.tsx. Useful for nodeapp because it has raw .cjs / .mjs.

const { MetroTransformerNative } = require("../../../lib/index.js");
const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = MetroTransformerNative(
  { nativeTransform: true, handleTs: true, handleJs: true },
  {}
);
module.exports = base;
