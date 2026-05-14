// Native transformer, default options. SWC strips TS, Babel finishes.

const { MetroTransformerNative } = require("../../../lib/index.js");
const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = MetroTransformerNative(
  { nativeTransform: true, handleTs: true },
  {}
);
module.exports = base;
