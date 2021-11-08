# @rnx-kit/typescript-react-native-compiler

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/typescript-react-native-compiler)](https://www.npmjs.com/package/@rnx-kit/typescript-react-native-compiler)

`@rnx-kit/typescript-react-native-compiler` is a TypeScript compiler with a
custom module resolver for react-native projects.

This package extends TypeScript, adding the concept of a platform. When
resolving modules, it uses the platform to find platform-override files such as
`foo.ios.ts` and `foo.native.ts`. It also uses the platform to map
`react-native` module references to out-of-tree platforms such as
`react-native-windows` and `react-native-macos`.
