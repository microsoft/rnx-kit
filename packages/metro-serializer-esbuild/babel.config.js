module.exports = {
  presets: ["@rnx-kit/babel-preset-metro-react-native"],
  plugins: [
    [
      "@rnx-kit/babel-plugin-import-path-remapper",
      { test: (source) => source.startsWith("@rnx-kit/") },
    ],
  ],
};
