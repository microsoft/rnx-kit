module.exports = {
  presets: [
    [
      "@rnx-kit/babel-preset-metro-react-native",
      { useTransformReactJSXExperimental: true },
    ],
  ],
  plugins: [[require("@rnx-kit/polyfills")]],
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
