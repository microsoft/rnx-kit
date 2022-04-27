# @rnx-kit/metro-swc-worker

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-swc-worker)](https://www.npmjs.com/package/@rnx-kit/metro-swc-worker)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

An experimental Metro transformer using [swc](https://swc.rs/).

## Requirements

This plugin currently depends on some unstable features introduced in Metro
[0.66.1](https://github.com/facebook/metro/releases/tag/v0.66.1). Breaking
changes were introduced in Metro 0.60, so this plugin will not work with React
Native below 0.64.

## Install

```sh
yarn add @rnx-kit/metro-swc-worker --dev
```

or if you're using npm:

```sh
npm add --save-dev @rnx-kit/metro-swc-worker
```

## Usage

`@rnx-kit/metro-swc-worker` falls back to Babel for assets and Flow files, and
relies on esbuild to perform import/export transformation and tree shaking. For
best effect, we also need to disable Babel's import/export transformation in
`babel.config.js`:

```diff
 module.exports = {
   presets: [
     ["module:metro-react-native-babel-preset", {
+      disableImportExportTransform: true
     }],
   ],
 };
```

Next, we configure Metro to use the esbuild serializer and swc as transformer in
`metro.config.js`:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  MetroSerializer,
+  esbuildTransformerConfig,
+} = require("@rnx-kit/metro-serializer-esbuild");

 module.exports = makeMetroConfig({
+  serializer: {
+    customSerializer: MetroSerializer(),
+  },
+  transformer: esbuildTransformerConfig,
+  transformerPath: require.resolve("@rnx-kit/metro-swc-worker"),
 });
```

## Known Limitations

- Similar to
  [Babel](https://babeljs.io/docs/en/babel-plugin-transform-typescript#typescript-compiler-options),
  your TypeScript code needs to be compilable with
  [Isolated Modules](https://www.typescriptlang.org/tsconfig#isolatedModules)
  enabled.
- Since this worker requires the esbuild serializer, it inherits all the
  limitations listed in the
  [README](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild#known-limitations).
