# @rnx-kit/types-plugin-cyclic-dependencies

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-plugin-cyclic-dependencies)](https://www.npmjs.com/package/@rnx-kit/types-plugin-cyclic-dependencies)

TypeScript type definitions for rnx-kit metro bundling plugins.

## Installation

```sh
yarn add @rnx-kit/types-plugin-cyclic-dependencies --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-plugin-cyclic-dependencies
```

## Usage

```ts
import type { CyclicDependencyPluginOptions } from "@rnx-kit/types-plugin-cyclic-dependencies";
```

## Types

### Bundler Plugin Types

#### `CyclicDependencyPluginOptions`

Options for `@rnx-kit/metro-plugin-cyclic-dependencies-detector`.

| Name               | Type                   | Description                                                |
| ------------------ | ---------------------- | ---------------------------------------------------------- |
| includeNodeModules | `boolean \| undefined` | Include external packages from node_modules when scanning. |
| linesOfContext     | `number \| undefined`  | Size of the module backtrace printed with error messages.  |
| throwOnError       | `boolean \| undefined` | Whether to throw an exception when a cycle is detected.    |
