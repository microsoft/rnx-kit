# @rnx-kit/metro-serializer-esbuild

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-serializer-esbuild)](https://www.npmjs.com/package/@rnx-kit/metro-serializer-esbuild)

⚠️ **THIS PLUGIN IS HIGHLY EXPERIMENTAL** ⚠️

Allow Metro to use [esbuild](https://esbuild.github.io) for bundling and
serialization.

## Requirements

This plugin currently depends on some unstable features in an as yet unreleased
version of Metro. The following features are presumed to exist in some form in
0.67 (or later), but no guarantees are made.

- [`transformer.unstable_disableModuleWrapping`](https://github.com/facebook/metro/commit/598de6f537f4d7286cee89094bcdb7101e8e4f17)
- [`transformer.unstable_disableNormalizePseudoGlobals`](https://github.com/facebook/metro/commit/5b913fa0cd30ce5b90e2b1f6318454fbdd170708)

## Usage

esbuild works best when we pass it ES6 modules. The first thing we must do is to
disable import/export transformation by enabling `disableImportExportTransform`
in `babel.config.js`:

```diff
 module.exports = {
   presets: [
     [
       "module:metro-react-native-babel-preset",
+      { disableImportExportTransform: true },
     ],
   ],
 };
```

Next, configure Metro to use the esbuild serializer by making the following
changes to `metro.config.js`:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  MetroSerializer,
+  esbuildTransformerConfig,
+} = require("@rnx-kit/metro-serializer-esbuild");

 module.exports = makeMetroConfig({
   projectRoot: __dirname,
+  serializer: {
+    customSerializer: MetroSerializer(),
+  },
+  transformer: esbuildTransformerConfig,
 });
```

We can now create a bundle as usual, e.g.:

```sh
react-native bundle --entry-file index.js --platform ios --dev false ...
```
