# @rnx-kit/metro-serializer

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-serializer)](https://www.npmjs.com/package/@rnx-kit/metro-serializer)

`@rnx-kit/metro-serializer` is Metro's default JavaScript bundle serializer, but
with support for plugins.

## Usage

Import and set the serializer to `serializer.customSerializer` in your
`metro.config.js`, then add your desired plugins. For instance, to add
`CyclicDependencies` and `DuplicateDependencies` plugins:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  CyclicDependencies,
+} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
+const {
+  DuplicateDependencies,
+} = require("@rnx-kit/metro-plugin-duplicates-checker");
+const { MetroSerializer } = require("@rnx-kit/metro-serializer");

 module.exports = makeMetroConfig({
   projectRoot: __dirname,
   serializer: {
+    customSerializer: MetroSerializer([
+      CyclicDependencies(),
+      DuplicateDependencies(),
+    ]),
   },
 });
```

## Expo

If you are using Expo, you most likely don't want to use this serializer, since
Expo uses its own custom serializer. For instance, to use the
`CyclicDependencies` and `DuplicateDependencies` plugins without the serializer:

```js
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.serializer.customSerializer = async (
  entryPoint,
  preModules,
  graph,
  options
) => {
  CyclicDependencies({
    // Options
  })(entryPoint, preModules, graph, options);
  DuplicateDependencies({
    // Options
  })(entryPoint, preModules, graph, options);
  return await config.serializer.customSerializer(
    entryPoint,
    preModules,
    graph,
    options
  );
};

module.exports = config;
```
