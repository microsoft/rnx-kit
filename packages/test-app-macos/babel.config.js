module.exports = {
  presets: [
    [
      "@rnx-kit/babel-preset-metro-react-native",
      { useTransformReactJSXExperimental: true },
    ],
  ],
  plugins: (() => {
    try {
      // Some plugins, like `@rnx-kit/polyfills`, may not have been built yet
      // when linters are running, for instance when we're running Knip.
      return [[require("@rnx-kit/polyfills")]];
    } catch (_) {
      return [];
    }
  })(),
  overrides: [
    {
      plugins: [
        [
          require("@babel/plugin-transform-react-jsx"),
          { runtime: "automatic" },
        ],
        [require("@babel/plugin-transform-react-jsx-source")],
      ],
    },
  ],
};
