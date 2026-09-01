module.exports = {
  presets: [["@rnx-kit/babel-preset-metro-react-native"]],
  plugins: (() => {
    try {
      // Some plugins, like `@rnx-kit/polyfills`, may not have been built yet
      // when linters are running, for instance when we're running Knip.
      return [[require("@rnx-kit/polyfills")]];
    } catch (_) {
      return [];
    }
  })(),
};
