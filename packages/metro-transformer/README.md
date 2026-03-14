# @rnx-kit/metro-transformer

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer)](https://www.npmjs.com/package/@rnx-kit/metro-transformer)

`@rnx-kit/metro-transformer` is a pluggable Metro transformer that lets you
route files to different Babel transformers based on glob patterns and merge transformer configuration
from multiple sources.

## Installation

```sh
yarn add @rnx-kit/metro-transformer --dev
```

## Usage

Use `MetroTransformer` to build the `transformer` section of your Metro config:

```js
// metro.config.js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const { MetroTransformer } = require("@rnx-kit/metro-transformer");
const { resolve } = require("node:path");

module.exports = makeMetroConfig({
  transformer: MetroTransformer({
    // any standard options can be used...
    getTransformOptions: async () => ({
      // options here
    }),
    // add in a specific file babel transformer
    babelTransformers: {
      // Route .svg files through react-native-svg-transformer
      "**/*.svg": resolve(
        require.resolve("react-native-svg-transformer/package.json"),
        "../transformer.js"
      ),
    },
  }),
});
```

## Configuration

`MetroTransformer(config)` accepts any number of `ExtendedTransformerConfig` objects
and returns a `TransformerConfigT` suitable for Metro's `transformer` field.

### `babelTransformers`

`Record<string, string>` — Maps glob patterns to absolute paths of Babel
transformers. When Metro processes a file, patterns are tested in insertion
order and the first match wins. Patterns are matched with
[micromatch](https://github.com/micromatch/micromatch) against the full file
path, so use `**` to match across directories (e.g. `"**/*.svg"` rather than
`"*.svg"`).

```js
MetroTransformer({
  babelTransformers: {
    "**/*.svg": require.resolve("react-native-svg-transformer/transformer"),
    "**/*.png": require.resolve("./myImageTransformer"),
  },
});
```

### `customTransformerOptions`

`Record<string, unknown>` — Arbitrary options merged into
`customTransformOptions` and forwarded to every Babel transformer. Useful for
passing configuration through to delegate transformers.

### Standard Metro transformer options

Any other field accepted by Metro's `TransformerConfigT` (e.g.
`getTransformOptions`, `babelTransformerPath`) can be included and will be
merged into the final config. Multiple configs are merged left-to-right, with
later values overwriting earlier ones.
