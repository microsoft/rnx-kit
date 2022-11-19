<!--remove-block start-->

# @rnx-kit/metro-serializer-esbuild

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-serializer-esbuild)](https://www.npmjs.com/package/@rnx-kit/metro-serializer-esbuild)
![Stability Beta](https://img.shields.io/badge/Stability-Beta-3bf)

<!--remove-block end-->

Allow Metro to use [esbuild](https://esbuild.github.io) for bundling and
serialization.

This tool is in Beta, and has been yielding good results so far. See the list of
known issues below for more information.

## Motivation

Metro currently does not implement tree shaking, i.e. it does not attempt to
remove unused code from the JS bundle. For instance, given this code snippet:

```ts
import { partition } from "lodash";
```

Metro will bundle all of `lodash` in your bundle even though you're only using a
small part of it. In `lodash`'s case, you can add
[`babel-plugin-lodash`](https://github.com/lodash/babel-plugin-lodash#readme) to
your Babel config to help Metro strip away some modules, but not all libraries
will come with such helpers. For more details, see issues
[#227](https://github.com/facebook/metro/issues/227) and
[#632](https://github.com/facebook/metro/issues/632).

metro-serializer-esbuild addresses this by letting esbuild take over bundling.

## Requirements

This plugin currently depends on some unstable features introduced in Metro
[0.66.1](https://github.com/facebook/metro/releases/tag/v0.66.1). Breaking
changes were introduced in Metro 0.60, so this plugin will not work with React
Native below 0.64.

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

If you're using `@rnx-kit/babel-preset-metro-react-native`, you don't need to
make any changes.

> Note that Hermes currently does not fully implement the
> [ES6 spec](https://kangax.github.io/compat-table/es6/). esbuild, on the other
> hand, does not fully support
> [lowering to ES5](https://github.com/evanw/esbuild/issues/297). This
> essentially means that you may have to add additional plugins if you're seeing
> esbuild outputting "target environment is not supported yet" errors during
> bundle. For an example, see the error and its solution in
> [#1743](https://github.com/microsoft/rnx-kit/issues/1743).

Next, configure Metro to use the esbuild serializer by making the following
changes to `metro.config.js`:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  MetroSerializer,
+  esbuildTransformerConfig,
+} = require("@rnx-kit/metro-serializer-esbuild");

 module.exports = makeMetroConfig({
   serializer: {
+    customSerializer: MetroSerializer(),
   },
+  transformer: esbuildTransformerConfig,
 });
```

We can now create a bundle as usual, e.g.:

```sh
react-native bundle --entry-file index.js --platform ios --dev false ...
```

## Options

Similar to
[`metro-serializer`](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer#usage),
`metro-serializer-esbuild` also supports plugins. Additionally, you can
configure the output of the plugin by passing an options object as the second
parameter. For instance, to output ES6 compliant code, set the target option:

```diff
 const myPlugins = [...];
 module.exports = makeMetroConfig({
   serializer: {
     customSerializer: MetroSerializer(myPlugins, {
+      target: "es6"
     }),
   },
   transformer: esbuildTransformerConfig,
 });
```

Below are all the currently supported options.

### `target`

Sets the target environment for the transpiled JavaScript code.

See the full documentation at https://esbuild.github.io/api/#target.

Values: Any JS language version string such as `es6` or `esnext`. You can also
use environment names. See the full documentation for a list of supported names.

Defaults to `hermes0.7.0`.

### `fabric`

When enabled, includes Fabric-enabled version of React. You can save some bytes
by disabling this if you haven't migrated to Fabric yet.

Defaults to `false`.

### `minify`

When enabled, the generated code will be minified instead of pretty-printed.

See the full documentation at https://esbuild.github.io/api/#minify.

Defaults to `true` in production environment; `false` otherwise.

### `sourceMapPaths`

Determines whether paths in the output source map are absolute or relative to
the directory containing the source map.

Values: `absolute` | `relative`

Defaults to `relative`.

### `strictMode`

By default, the `"use strict";` directive is added by Babel and esbuild when
lowering to ES5. You can save some bytes by telling this serializer to strip
them from the bundle.

Note that disabling `strictMode` here will definitely break source maps. It is
recommended to try disabling strict mode in Babel or TypeScript first before
considering this option. If you can target ES6, that is a better alternative.

This flag only affects production environment.

Defaults to `true`.

### `analyze`

Sets whether esbuild should output a report at the end of bundling.

See the full documentation at https://esbuild.github.io/api/#analyze.

Values: `false` | `true` | `verbose`

Defaults to `false`.

### `logLevel`

The log level passed to esbuild.

See the full documentation at https://esbuild.github.io/api/#log-level

Values: `verbose` | `debug` | `info` | `warning` | `error` | `silent`

Defaults to `warning`.

## Metro + ESM Support

Metro currently does not support ESM. However, if you're looking to save even
more bytes, and are comfortable with solving CJS vs ESM resolution issues, you
can try adding `module` to
[`resolver.resolverMainFields`](https://facebook.github.io/metro/docs/configuration#resolvermainfields)
in `metro.config.js`. This will tell Metro to always pick ESM over CJS when
possible. Note that this can lead to unexpected errors since you cannot import
ESM from CJS. Until https://github.com/facebook/metro/issues/670 lands, you are
basically on your own to fix any issues that might come up.

## Known Limitations

- Dev server does not play well with `esbuildTransformerConfig`. To work around
  this limitation, you can save the esbuild specific Metro config to a separate
  file and only specify it when needed, e.g.:
  ```sh
  react-native bundle ... --config metro+esbuild.config.js
  ```
- esbuild does not properly tree-shake `export *`. This is a known limitation
  (see https://github.com/evanw/esbuild/issues/1420). It is also not recommended
  to use `export *` in your code as they may lead to duplicate exports. For more
  details, read https://hackmd.io/Z021hgSGStKlYLwsqNMOcg. This can be mitigated
  with an ESLint rule, such as `no-export-all` from
  [`@rnx-kit/eslint-plugin`](https://github.com/microsoft/rnx-kit/tree/main/packages/eslint-plugin#readme).
- esbuild is incompatible with
  [RAM bundle](https://facebook.github.io/metro/docs/bundling/#indexed-ram-bundle).
  If you require RAM bundles, you cannot use this serializer. In fact, Metro
  will simply ignore it.
