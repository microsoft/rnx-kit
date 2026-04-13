# @rnx-kit/metro-transformer-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-native)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-native)

A Metro transformer that uses native tools (esbuild or SWC) to preprocess
TypeScript (and optionally JavaScript) files before passing them through Babel.
This is a drop-in replacement for `@react-native/metro-babel-transformer` that
significantly speeds up TypeScript stripping while preserving full compatibility
with the standard Metro/Babel pipeline.

## How it works

The transformer operates in a multi-stage pipeline:

1. **Source preprocessing** — TypeScript files are run through esbuild (or SWC)
   to strip types and (optionally) transform JSX. JavaScript files can also be
   preprocessed when `handleJs` is enabled.
2. **SVG transformation** (optional) — SVG files are converted to React Native
   components using `@svgr/core`.
3. **Final transformation** — The preprocessed source is parsed with OXC (or
   hermes-parser as fallback) and then transformed with Babel, applying the
   project's Babel config with TypeScript-related plugins filtered out (since the
   native engine already handled that).

Upstream delegation allows routing specific file extensions to different
transformers entirely, enabling composition with other transformer packages.

## Installation

```sh
yarn add @rnx-kit/metro-transformer-native --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-transformer-native
```

### Optional: SVG support

To enable SVG-to-component transformation, install the optional peer
dependencies:

```sh
yarn add @svgr/core @svgr/plugin-svgo @svgr/plugin-jsx --dev
```

## Usage

Add it to your `metro.config.js`:

```js
const {
  MetroTransformerNative,
} = require("@rnx-kit/metro-transformer-native");

module.exports = {
  // ...
  transformer: {
    ...MetroTransformerNative({
      // options (see below)
    }),
  },
};
```

If you have an existing transformer config you want to preserve, spread it
before the native config (the `babelTransformerPath` must come from this
package):

```js
module.exports = {
  // ...
  transformer: {
    ...existingTransformerConfig,
    ...MetroTransformerNative({
      // options
    }),
  },
};
```

## Options

| Option              | Type                                 | Default      | Description                                                                                                                     |
| ------------------- | ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `engine`            | `"esbuild" \| "swc"`                | `"esbuild"`  | Which native engine to use for source preprocessing.                                                                            |
| `nativeTransform`   | `boolean`                            | `true`       | Top-level toggle to disable all native transformations.                                                                         |
| `handleTs`          | `boolean`                            | `true`       | Preprocess TypeScript files with the native engine.                                                                             |
| `handleJs`          | `boolean`                            | `false`      | Preprocess JavaScript files with the native engine.                                                                             |
| `handleJsx`         | `boolean`                            | `false`      | Transform JSX with the native engine (automatic runtime). Applies to TSX by default; also applies to JSX when `handleJs` is on. |
| `handleModules`     | `boolean`                            | `false`      | Handle module syntax transformations natively.                                                                                  |
| `handleSvg`         | `boolean`                            | `false`      | Transform `.svg` files into React Native components using `@svgr/core`.                                                         |
| `dynamicKey`        | `boolean \| string`                  | `undefined`  | Add a dynamic element to the cache key. `true` uses the current timestamp (cache-busting).                                      |
| `asyncTransform`    | `boolean`                            | `false`      | Run transformations asynchronously.                                                                                             |
| `upstreamDelegates` | `Record<string, string \| string[]>` | `undefined`  | Delegate specific file extensions to other transformers.                                                                        |

### Upstream delegates example

Route `.json` files to a custom transformer while using esbuild for everything
else:

```js
MetroTransformerNative({
  upstreamDelegates: {
    [require.resolve("./my-json-transformer")]: ".json",
    [require.resolve("./my-other-transformer")]: [".graphql", ".gql"],
  },
});
```

## Hermes support

When Metro's `unstable_transformProfile` is set to `hermes-stable` or
`hermes-canary`, the esbuild step targets the Hermes engine and enables
Hermes-supported syntax features (arrow functions, destructuring, generators,
template literals, etc.).
