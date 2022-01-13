if (process.env.NODE_ENV !== "test") {
  module.exports = {
    presets: [
      [
        "module:metro-react-native-babel-preset",
        { disableImportExportTransform: true },
      ],
    ],
    plugins: [
      [
        "@rnx-kit/babel-plugin-import-path-remapper",
        { test: (source) => source.startsWith("@rnx-kit/") },
      ],
    ],
  };
}
