# @rnx-kit/babel-preset-metro-react-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/babel-preset-metro-react-native)](https://www.npmjs.com/package/@rnx-kit/babel-preset-metro-react-native)

`@rnx-kit/babel-preset-metro-react-native` provides a Babel preset for React
Native applications that you can use as a drop-in replacement for
[`metro-react-native-babel-preset`](https://github.com/facebook/metro/tree/master/packages/metro-react-native-babel-preset)).

## Usage

Add `@rnx-kit/babel-preset-metro-react-native` to your `babel.config.js`:

```js
module.exports = {
  presets: ["@rnx-kit/babel-preset-metro-react-native"],
};
```

If you want to add additional plugins, you can pass an options object:

```js
module.exports = {
  presets: [
    [
      "@rnx-kit/babel-preset-metro-react-native",
      {
        additionalPlugins: ["const-enum"],
      },
    ],
  ],
};
```

## Notes on Bundle Size

If you're looking to reduce the bundle size, here are a couple of things you can
try.

### Enable experimental import/export support

In your `metro.config.js`, enable `experimentalImportSupport`:

```js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true,
      },
    }),
  },
};
```

And disable import/export transformation in your `babel.config.js`:

```js
module.exports = {
  presets: [
    [
      "@rnx-kit/babel-preset-metro-react-native",
      { disableImportExportTransform: true },
    ],
  ],
};
```

Doing this will help the minifier strip out some unused code, but make sure that
your app still works after enabling it.

### `babel-plugin-lodash`

If you're using [Lodash](https://lodash.com), you can get some reduction with
[babel-plugin-lodash](https://github.com/lodash/babel-plugin-lodash). Add it to
your `babel.config.js` like below:

```js
module.exports = {
  presets: ["@rnx-kit/babel-preset-metro-react-native"],
  plugins: ["lodash"],
};
```
