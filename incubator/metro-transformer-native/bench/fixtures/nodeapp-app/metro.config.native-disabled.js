// Native-transformer package wired in, but nativeTransform:false — all
// work falls back to Babel. This validates the disable-escape-valve and
// gives an apples-to-apples comparison without changing the wrapper.

const { MetroTransformerNative } = require("../../../lib/index.js");
const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = MetroTransformerNative(
  { nativeTransform: false, handleTs: true },
  {}
);
module.exports = base;
