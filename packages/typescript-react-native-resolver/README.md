# @rnx-kit/typescript-react-native-resolver

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typescript-react-native-resolver)](https://www.npmjs.com/package/@rnx-kit/typescript-react-native-resolver)

`@rnx-kit/typescript-react-native-resolver` is a TypeScript module resolver for
use with react-native projects.

## 🛑 Deprecated 🛑

This tool has been deprecated in favor of using
`@rnx-kit/metro-plugin-typescript`, which is built on the `moduleSuffixes`
TypeScript
[compiler option](https://www.typescriptlang.org/tsconfig#moduleSuffixes).

You may continue to use it, but it will be removed in a future release.

## Synopsis

This resolver uses the target platform to find platform-override files such as
`foo.ios.ts` and `foo.native.ts`. It also maps `react-native` module references
to out-of-tree platforms such as `react-native-windows` and
`react-native-macos`. For performance reasons, these mappings are built into the
resolver, rather than loaded dynamically using `@react-native-community/cli`.
