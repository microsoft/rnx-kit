// Baseline: stock @react-native/metro-babel-transformer. No SWC.

const { baseConfig } = require("./_metro-base.js");

const base = baseConfig();
base.transformer = {
  babelTransformerPath: require.resolve("@react-native/metro-babel-transformer"),
};
module.exports = base;
