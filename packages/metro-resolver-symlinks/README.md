# @rnx-kit/metro-resolver-symlinks

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-resolver-symlinks)](https://www.npmjs.com/package/@rnx-kit/metro-resolver-symlinks)

`@rnx-kit/metro-resolver-symlinks` is a Metro resolver with proper support for
symlinks. This is especially useful in monorepos, or repos using package
managers that make heavy use of symlinks (such as pnpm).

## Usage

Import and set the resolver to `resolver.resolveRequest` in your
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
