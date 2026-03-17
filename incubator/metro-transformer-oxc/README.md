# @rnx-kit/metro-transformer-oxc

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-oxc)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-oxc)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A Metro transformer that uses `oxc-parser`.

## Installation

```sh
yarn add @rnx-kit/metro-transformer-oxc --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-transformer-oxc
```

## Usage

Add it to your `metro.config.js`:

```diff
   },
+  transformer: {
+    babelTransformerPath: require.resolve("@rnx-kit/metro-transformer-oxc"),
+  },
 }
```
