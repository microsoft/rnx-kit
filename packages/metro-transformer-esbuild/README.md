<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/metro-transformer-esbuild

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer-esbuild)](https://www.npmjs.com/package/@rnx-kit/metro-transformer-esbuild)

esbuild-based TypeScript/JSX transformer and minifier for
[Metro](https://metrobundler.dev/). Uses [esbuild](https://esbuild.github.io/)
for fast TypeScript transpilation and
[hermes-parser](https://www.npmjs.com/package/hermes-parser) for
Babel-compatible AST production.

## Motivation

Metro's default Babel-based pipeline can be slow for large TypeScript codebases.
This package replaces Babel entirely for the transform step by using esbuild (a
native Go binary) for transpilation and hermes-parser (a native C++ parser) for
AST generation. This maximizes the use of native tooling for faster builds.

Each feature — **transpilation** and **minification** — can be enabled
independently.

## Installation

```sh
yarn add @rnx-kit/metro-transformer-esbuild esbuild hermes-parser --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/metro-transformer-esbuild esbuild hermes-parser
```

> **Note:** `esbuild` and `hermes-parser` are peer dependencies. You must
> install them separately.

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

Use esbuild for TypeScript/JSX transpilation, keep Metro's default minifier:

```js
module.exports = {
  transformer: {
    ...makeEsbuildTransformerConfig({
      esbuildTransformer: true,
    }),
  },
};
```

### Minification Only

Keep the default transformer, use esbuild for minification:

```js
module.exports = {
  transformer: {
    ...makeEsbuildTransformerConfig({
      esbuildMinifier: true,
    }),
  },
};
```

### Advanced Options

Both features accept an options object for fine-grained control:

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

| Option            | Type                                        | Default        | Description                              |
| ----------------- | ------------------------------------------- | -------------- | ---------------------------------------- |
| `target`          | `string \| string[]`                        | `"hermes0.12"` | ECMAScript target version(s) for esbuild |
| `jsx`             | `"automatic" \| "transform" \| "preserve"`  | `"automatic"`  | JSX transform mode                       |
| `jsxFactory`      | `string`                                    | —              | JSX factory (classic mode only)          |
| `jsxFragment`     | `string`                                    | —              | JSX fragment (classic mode only)         |
| `jsxImportSource` | `string`                                    | `"react"`      | JSX import source (automatic mode only)  |
| `jsxDev`          | `boolean`                                   | matches `dev`  | Use JSX dev runtime in dev builds        |
| `define`          | `Record<string, string>`                    | —              | Global define replacements               |
| `pure`            | `string[]`                                  | —              | Functions to mark as pure                |

## Minifier Options

| Option              | Type                          | Default        | Description                     |
| ------------------- | ----------------------------- | -------------- | ------------------------------- |
| `minify`            | `boolean`                     | `true`         | Enable all minification         |
| `minifyWhitespace`  | `boolean`                     | `= minify`     | Enable whitespace removal       |
| `minifyIdentifiers` | `boolean`                     | `= minify`     | Enable identifier shortening    |
| `minifySyntax`      | `boolean`                     | `= minify`     | Enable syntax-level minification|
| `sourceMap`         | `boolean`                     | `true`         | Generate source maps            |
| `target`            | `string \| string[]`          | `"hermes0.12"` | Target for minification output  |
| `pure`              | `string[]`                    | —              | Pure function annotations       |
| `drop`              | `("console" \| "debugger")[]` | —              | Statements to drop              |

## How It Works

**Transpilation:** The esbuild transformer is standalone — it does not delegate
to `@react-native/metro-babel-transformer`. For each file, esbuild strips
TypeScript types, transforms JSX, and downlevels ES features to the target.
Then hermes-parser produces a Babel-compatible AST that Metro uses for
dependency collection and module wrapping.

**Minification:** The esbuild minifier replaces Metro's default minifier. It
receives bundled code from Metro and uses esbuild's `transformSync` API with
minification flags for fast whitespace removal, identifier shortening, and
syntax-level optimization.
