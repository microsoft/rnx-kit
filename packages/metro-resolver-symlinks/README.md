# @rnx-kit/metro-resolver-symlinks

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-resolver-symlinks)](https://www.npmjs.com/package/@rnx-kit/metro-resolver-symlinks)

`@rnx-kit/metro-resolver-symlinks` is a Metro resolver with proper support for
symlinks. This is especially useful in monorepos, or repos using package
managers that make heavy use of symlinks (such as pnpm).

## Installation

```sh
yarn add @rnx-kit/metro-resolver-symlinks --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-resolver-symlinks
```

## Usage

Import and assign the resolver to `resolver.resolveRequest` in your
`metro.config.js`:

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const MetroSymlinksResolver = require("@rnx-kit/metro-resolver-symlinks");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  resolver: {
    resolveRequest: MetroSymlinksResolver(),
  },
});
```

## Options

| Option      | Type                           | Description                                         |
| :---------- | :----------------------------- | :-------------------------------------------------- |
| remapModule | `(moduleId: string) => string` | A custom function for remapping additional modules. |

### `remapModule`

`remapModule` allows additional remapping of modules. For instance, there is a
`remapImportPath` utility that remaps requests of `lib/**/*.js` to
`src/**/*.ts`. This is useful for packages that don't correctly export
everything in their main JS file.

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
 const MetroSymlinksResolver = require("@rnx-kit/metro-resolver-symlinks");

 module.exports = makeMetroConfig({
   projectRoot: __dirname,
   resolver: {
     resolveRequest: MetroSymlinksResolver({
+      remapModule: MetroSymlinksResolver.remapImportPath({
+        test: (moduleId) => moduleId.startsWith("@rnx-kit/"),
+        extensions: [".ts", ".tsx"],     # optional
+        mainFields: ["module", "main"],  # optional
+      }),
     }),
   },
 });
```

> **Sidenote:** When Metro releases a version with the ability to set a
> [custom resolver for Haste requests](https://github.com/facebook/metro/commit/96fb6e904e1660b37f4d1f5353ca1e5477c4afbf),
> this way of remapping modules is preferable over
> `@rnx-kit/babel-plugin-import-path-remapper`. The Babel plugin mutates the AST
> and requires a second pass.
