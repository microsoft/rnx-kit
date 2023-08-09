# @rnx-kit/polyfills

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/polyfills)](https://www.npmjs.com/package/@rnx-kit/polyfills)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a polyfills "autolinker" for React Native. It works like native module
autolinking, but gathers polyfills from dependencies instead.

## Motivation

Please read the
[Modularity](https://github.com/microsoft/rnx-kit/blob/tido/react-native-standard-api/text/0002-react-native-webapis.md#modularity)
section of the
[React Native WebAPIs RFC](https://github.com/microsoft/rnx-kit/pull/2504) for
its raison d'être.

## Installation

```sh
yarn add @rnx-kit/polyfills --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/polyfills
```

## Usage

1. Add the Babel plugin:

   ```diff
    // babel.config.js
    module.exports = {
      presets: ["module:@react-native/babel-preset"],
   +  plugins: [require("@rnx-kit/polyfills")],
    };
   ```

2. In your `index.ts` (or `index.js`), add the following comment at the top of
   the file:

   ```
   // @react-native-webapis
   ```
