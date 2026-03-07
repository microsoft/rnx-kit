<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/metro-transformer-esbuild

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-esbuild)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-esbuild)

esbuild-based TypeScript/JSX pre-processor for
[Metro](https://metrobundler.dev/). Uses [esbuild](https://esbuild.github.io/)
as a fast first pass to strip TypeScript and optionally transform JSX, then
delegates to `@react-native/metro-babel-transformer` for the full babel preset
pipeline.

## Motivation

Metro's default Babel-based pipeline parses TypeScript from scratch using Babel
plugins. This package uses esbuild (a native Go binary) as a fast first pass to
strip TypeScript types and optionally transform JSX, preserving ESM imports for
downstream tree-shaking. The upstream babel transformer then handles everything
else — Fast Refresh, codegen, Flow enums, lazy imports, etc.

Each feature — **transpilation** and **minification** — can be enabled
independently.

## Installation

```sh
yarn add @rnx-kit/metro-transformer-esbuild esbuild --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-transformer-esbuild esbuild
```

> **Note:** `esbuild` and `@react-native/metro-babel-transformer` are peer
> dependencies. `@react-native/metro-babel-transformer` is typically already
> installed via `react-native`.

## Usage

In your `metro.config.js`:

```js
const {
  makeEsbuildTransformerConfig,
} = require("@rnx-kit/metro-transformer-esbuild");

module.exports = {
  transformer: {
    // Enable both esbuild transpilation and minification
    ...makeEsbuildTransformerConfig({
      esbuildTransformer: true,
      esbuildMinifier: true,
    }),
  },
};
```

### Transpilation Only

Use esbuild for TypeScript/JSX pre-processing, keep Metro's default minifier:

```js
module.exports = {
  transformer: {
    ...makeEsbuildTransformerConfig({
      esbuildTransformer: true,
    }),
  },
};
```

### Let Babel Handle JSX

By default esbuild transforms JSX. To let the babel preset handle JSX instead
(useful if you have Babel plugins that inspect JSX nodes):

```js
module.exports = {
  transformer: {
    ...makeEsbuildTransformerConfig({
      esbuildTransformer: {
        jsx: "preserve",
      },
    }),
  },
};
```

### Advanced Options

```js
module.exports = {
  transformer: {
    ...makeEsbuildTransformerConfig({
      esbuildTransformer: {
        target: "hermes0.12",
        jsx: "automatic",
        jsxImportSource: "react",
        define: { __DEV__: "true" },
      },
      esbuildMinifier: {
        minify: true,
        drop: ["console", "debugger"],
        sourceMap: true,
      },
    }),
  },
};
```

## Transformer Options

| Option            | Type                                       | Default        | Description                                    |
| ----------------- | ------------------------------------------ | -------------- | ---------------------------------------------- |
| `target`          | `string \| string[]`                       | `"hermes0.12"` | ECMAScript target version(s) for esbuild       |
| `jsx`             | `"automatic" \| "transform" \| "preserve"` | `"automatic"`  | JSX mode (`"preserve"` to let babel handle it) |
| `jsxFactory`      | `string`                                   | —              | JSX factory (classic mode only)                |
| `jsxFragment`     | `string`                                   | —              | JSX fragment (classic mode only)               |
| `jsxImportSource` | `string`                                   | `"react"`      | JSX import source (automatic mode only)        |
| `jsxDev`          | `boolean`                                  | matches `dev`  | Use JSX dev runtime in dev builds              |
| `define`          | `Record<string, string>`                   | —              | Global define replacements                     |
| `pure`            | `string[]`                                 | —              | Functions to mark as pure                      |

## Minifier Options

| Option              | Type                          | Default        | Description                      |
| ------------------- | ----------------------------- | -------------- | -------------------------------- |
| `minify`            | `boolean`                     | `true`         | Enable all minification          |
| `minifyWhitespace`  | `boolean`                     | `= minify`     | Enable whitespace removal        |
| `minifyIdentifiers` | `boolean`                     | `= minify`     | Enable identifier shortening     |
| `minifySyntax`      | `boolean`                     | `= minify`     | Enable syntax-level minification |
| `sourceMap`         | `boolean`                     | `true`         | Generate source maps             |
| `target`            | `string \| string[]`          | `"hermes0.12"` | Target for minification output   |
| `pure`              | `string[]`                    | —              | Pure function annotations        |
| `drop`              | `("console" \| "debugger")[]` | —              | Statements to drop               |

## How It Works

**Transpilation:** esbuild runs as a first pass to strip TypeScript types and
optionally transform JSX, preserving ES module import/export syntax. The
resulting JavaScript is then passed to `@react-native/metro-babel-transformer`
which applies the full `@react-native/babel-preset` — including Fast Refresh,
codegen, Flow enum support, and all configured Babel plugins. TypeScript
filenames are renamed to `.js` when delegating to prevent redundant TS parsing.
The upstream transformer uses `hermes-parser` for fast native parsing.

**Minification:** The esbuild minifier replaces Metro's default minifier. It
receives bundled code from Metro and uses esbuild's `transform` API with
minification flags for fast whitespace removal, identifier shortening, and
syntax-level optimization.
