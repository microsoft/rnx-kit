# @rnx-kit/babel-preset-metro-react-native

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
