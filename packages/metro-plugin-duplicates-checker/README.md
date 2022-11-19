<!--remove-block start-->

# @rnx-kit/metro-plugin-duplicates-checker

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-plugin-duplicates-checker)](https://www.npmjs.com/package/@rnx-kit/metro-plugin-duplicates-checker)

<!--remove-block end-->

`@rnx-kit/metro-plugin-duplicates-checker` checks for duplicate packages in your
bundle.

## Usage

There are several ways to use this package.

The **recommended** way is to add it as a plugin in your `metro.config.js` using
`@rnx-kit/metro-serializer`:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  DuplicateDependencies,
+} = require("@rnx-kit/metro-plugin-duplicates-checker");
+const { MetroSerializer } = require("@rnx-kit/metro-serializer");

 module.exports = makeMetroConfig({
   serializer: {
+    customSerializer: MetroSerializer([DuplicateDependencies()]),
   },
 });
```

You can also check for duplicate packages after a bundle is created:

```js
const {
  checkForDuplicatePackagesInFile,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackagesInFile(pathToSourceMapFile, {
  ignoredModules: [],
  bannedModules: [],
});
```

If you have a source map object, you can pass that directly to
`checkForDuplicatePackages()`:

```js
const {
  checkForDuplicatePackages,
} = require("@rnx-kit/metro-plugin-duplicates-checker");

checkForDuplicatePackages(mySourceMap, {
  ignoredModules: [],
  bannedModules: [],
});
```

## Options

| Key            | Type     | Default | Description                                 |
| :------------- | :------- | :------ | :------------------------------------------ |
| bannedModules  | string[] | `[]`    | List of modules that are banned.            |
| ignoredModules | string[] | `[]`    | List of modules that can be ignored.        |
| throwOnError   | boolean  | `true`  | Whether to throw when duplicates are found. |
