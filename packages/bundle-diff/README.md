<!--remove-block start-->

# @rnx-kit/bundle-diff

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/bundle-diff)](https://www.npmjs.com/package/@rnx-kit/bundle-diff)

<!--remove-block end-->

A simple tool for diffing two bundles. Useful for getting an overview of which
files are included in one bundle but not the other. For example, comparing a
bundle produced by Webpack vs. one produced by Metro.

## Usage

```
rnx-bundle-diff <a.jsbundle.map> <b.jsbundle.map>
```

Example output:

```
     +106    added  /~/node_modules/@babel/runtime/helpers/arrayWithHoles.js
      +96    added  /~/node_modules/lodash-es/_realNames.js
      +49    added  /~/node_modules/@babel/runtime/regenerator/index.js
       +1  changed  /~/node_modules/react/index.js
     -127  removed  /~/node_modules/querystring-es3/index.js
     -286  removed  /~/node_modules/react-native/Libraries/Components/Picker/PickerAndroid.ios.js
     -592  removed  /~/node_modules/react-native/Libraries/Components/Sound/SoundManager.js
  unknown    added  /~/packages/awesome-app/lib/index.js
```

Note that the numbers are in bytes, and based on the unminified code. They are
meant to give an idea of how big the file is, but could differ wildly depending
on a number of factors, including Babel plugins, Wepback config, TypeScript
compilation options, indentation etc.

## Troubleshooting

### I have a lot of unknown content sizes in my diff

If you're using TypeScript, you need to tell `tsc` to also include source
content in the source map:

```json
// tsconfig.json
{
  "compilerOptions": {
    "inlineSources": true
  }
}
```

### I have a lot of relative paths in my source map

If your project is using TypeScript and Webpack, you may experience that your
source maps don't properly map back to the source file. Try using
[`source-map-loader`](https://webpack.js.org/loaders/source-map-loader/) to
clean up the paths:

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|(js)?bundle)($|\?)/i,
        enforce: "pre",
        use: ["source-map-loader"],
      },
    ],
  },
};
```
