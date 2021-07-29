# @rnx-kit/jest-resolver

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/jest-resolver)](https://www.npmjs.com/package/@rnx-kit/jest-resolver)

⚠️ **THIS PLUGIN IS DEPRECATED. You should use
[@rnx-kit/jest-preset](https://github.com/microsoft/rnx-kit/tree/main/packages/jest-preset#readme)
instead.** ⚠️

A Jest resolver with support for React Native
[out-of-tree platforms](https://reactnative.dev/docs/out-of-tree-platforms).

## Usage

Add `resolver: '@rnx-kit/jest-resolver'` to your Jest config:

```diff
 module.exports = {
   ...
+  resolver: '@rnx-kit/jest-resolver',
   ...
 };
```
