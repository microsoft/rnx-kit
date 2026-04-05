# @rnx-kit/metro-transformer-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-esbuild)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-esbuild)

A Metro transformer that uses [esbuild](https://esbuild.github.io/) to
preprocess TypeScript (and optionally JavaScript) files before passing them
through Babel. This is a drop-in replacement for `@react-native/metro-babel-transformer`
that significantly speeds up TypeScript stripping while preserving full
compatibility with the standard Metro/Babel pipeline.

## How it works

The transformer operates in a multi-stage pipeline:

1. **Source preprocessing** — TypeScript files are run through esbuild to strip
   types and (optionally) transform JSX. JavaScript files can also be
   preprocessed when `handleJs` is enabled.
2. **SVG transformation** (optional) — SVG files are converted to React Native
   components using `@svgr/core`.
3. **Final transformation** — The preprocessed source is parsed with
   `hermes-parser` and then transformed with Babel, applying the project's Babel
   config with TypeScript-related plugins filtered out (since esbuild already
   handled that).

Upstream delegation allows routing specific file extensions to different
transformers entirely, enabling composition with other transformer packages.

## Installation

```sh
yarn add @rnx-kit/metro-transformer-esbuild --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-transformer-esbuild
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
  MetroTransformerEsbuild,
} = require("@rnx-kit/metro-transformer-esbuild");

module.exports = {
  // ...
  transformer: {
    ...MetroTransformerEsbuild({
      // options (see below)
    }),
  },
};
```

If you have an existing transformer config you want to preserve, spread it
before the esbuild config (the `babelTransformerPath` must come from this
package):

```js
module.exports = {
  // ...
  transformer: {
    ...existingTransformerConfig,
    ...MetroTransformerEsbuild({
      // options
    }),
  },
};
```

You can also use `mergeTransformerConfigs` from `@rnx-kit/tools-react-native`
for deep merging when composing multiple transformer plugins:

```js
const {
  mergeTransformerConfigs,
} = require("@rnx-kit/tools-react-native/metro-utils");

module.exports = {
  // ...
  transformer: mergeTransformerConfigs(
    existingTransformerConfig,
    MetroTransformerEsbuild({
      /* options */
    })
  ),
};
```

## Options

| Option              | Type                                 | Default     | Description                                                                                                                                                                                                 |
| ------------------- | ------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `handleJs`          | `boolean`                            | `false`     | Preprocess JavaScript files with esbuild in addition to TypeScript.                                                                                                                                         |
| `handleJsx`         | `boolean`                            | `false`     | Transform JSX with esbuild (automatic runtime). Applies to TSX files by default; also applies to JSX files when `handleJs` is enabled. When a file is not processed by esbuild, Babel handles JSX as usual. |
| `handleSvg`         | `boolean`                            | `false`     | Transform `.svg` files into React Native components using `@svgr/core`. Requires the optional peer dependencies.                                                                                            |
| `dynamicKey`        | `boolean \| string`                  | `undefined` | Add a dynamic element to the cache key. `true` uses the current timestamp (cache-busting); a string value is appended as-is.                                                                                |
| `asyncTransform`    | `boolean`                            | `false`     | Run transformations asynchronously.                                                                                                                                                                         |
| `upstreamDelegates` | `Record<string, string \| string[]>` | `undefined` | Delegate specific file extensions to other transformers. Keys are transformer paths, values are extensions (including the dot).                                                                             |

### Upstream delegates example

Route `.json` files to a custom transformer while using esbuild for everything
else:

```js
MetroTransformerEsbuild({
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
