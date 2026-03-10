# @rnx-kit/metro-transformer

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-transformer)](https://www.npmjs.com/package/@rnx-kit/metro-transformer)

`@rnx-kit/metro-transformer` is a pluggable Metro transformer that lets you
route files to different Babel transformers based on glob patterns, override the
upstream Babel transformer, and compose transformer configuration from multiple
sources (including third-party plugins).

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

`MetroTransformer(config)` accepts an `ExtendedTransformerConfig` object (or
an array of them) and returns a `TransformerConfigT` suitable for Metro's
`transformer` field.

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

### `upstreamBabelOverridePath`

`string` — Absolute path to a Babel transformer that should be used as the
upstream fallback instead of the default
`@react-native/metro-babel-transformer`. When set, any delegate transformer
that internally requires `@react-native/metro-babel-transformer` will be
redirected to this path automatically.

```js
MetroTransformer({
  upstreamBabelOverridePath: require.resolve("my-custom-babel-transformer"),
  babelTransformers: {
    "**/*.svg": require.resolve("react-native-svg-transformer/transformer"),
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

## Plugin API

Third-party packages can expose a `TransformerPlugin` to contribute transformer
configuration. Pass multiple configs as an array to `MetroTransformer` to merge
plugin and user settings together.

```ts
import type { TransformerPlugin } from "@rnx-kit/types-metro-config";

export const myPlugin: TransformerPlugin = {
  transformer: {
    babelTransformers: {
      "**/*.svg": require.resolve("./svgTransformer"),
    },
  },
  // Set to true to apply this plugin's config after the user's config,
  // allowing it to take precedence.
  highPrecedence: false,
};
```

Spread a plugin's `transformer` config into the array passed to
`MetroTransformer`:

```js
const { MetroTransformer } = require("@rnx-kit/metro-transformer");
const { myPlugin } = require("my-metro-transformer-plugin");

module.exports = makeMetroConfig({
  transformer: MetroTransformer([
    myPlugin.transformer,
    {
      // user config (applied after plugin config; user settings win by default)
    },
  ]),
});
```

By default, configs earlier in the array are overwritten by later entries.
Use a plugin's `highPrecedence` flag to determine the intended order.
