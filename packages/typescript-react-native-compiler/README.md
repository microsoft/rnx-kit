<!--remove-block start-->

# @rnx-kit/typescript-react-native-compiler

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typescript-react-native-compiler)](https://www.npmjs.com/package/@rnx-kit/typescript-react-native-compiler)

<!--remove-block end-->

`@rnx-kit/typescript-react-native-compiler` is the TypeScript compiler `tsc`
with a custom module resolver for react-native projects.

This package extends TypeScript, adding the concept of a platform to `tsc`. When
resolving modules, the platform is used to find platform-extension files such as
`foo.ios.ts` and `foo.native.ts`. The platform is also used to map
`react-native` module references to out-of-tree platforms such as
`react-native-windows` and `react-native-macos`.

This package exports a new command-line tool: `rn-tsc`. It is a drop-in
replacement for `tsc` with a few additional command-line parameters.

## Example Commands

```bash
yarn run rn-tsc --platform ios --platformExtensions mobile,native
```

```bash
yarn run rn-tsc --platform macos --platformExtensions native --disableReactNativePackageSubstitution
```

Run a normal build without using the custom module resolver:

```bash
yarn run rn-tsc
```

Get a full listing of all command-line parameters:

```bash
yarn run rn-tsc --help
```
