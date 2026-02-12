# @rnx-kit/types-bundle-plugin-options

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-bundle-config)](https://www.npmjs.com/package/@rnx-kit/types-bundle-plugin-options)

TypeScript type definitions for rnx-kit metro bundling plugins.

## Installation

```sh
yarn add @rnx-kit/types-bundle-plugin-options --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-bundle-plugin-options
```

## Usage

```ts
import type {
  CyclicDependencyPluginOptions,
  DuplicateDetectorPluginOptions,
  TypeScriptPluginOptions,
} from "@rnx-kit/types-bundle-plugin-options";
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

#### `DuplicateDetectorPluginOptions`

Options for `@rnx-kit/metro-plugin-duplicates-checker`.

| Name           | Type                             | Description                                                 |
| -------------- | -------------------------------- | ----------------------------------------------------------- |
| ignoredModules | `readonly string[] \| undefined` | List of modules to ignore when scanning for duplicates.     |
| bannedModules  | `readonly string[] \| undefined` | List of modules that always cause a failure.                |
| throwOnError   | `boolean \| undefined`           | Whether to throw an exception when a duplicate is detected. |

#### `SerializerEsbuildOptions`

Options for `@rnx-kit/metro-serializer-esbuild` tree shaking.

| Name              | Type                              | Description                                  |
| ----------------- | --------------------------------- | -------------------------------------------- |
| minify            | `boolean \| undefined`            | Enable all minification.                     |
| minifyWhitespace  | `boolean \| undefined`            | Minify whitespace.                           |
| minifyIdentifiers | `boolean \| undefined`            | Minify identifiers.                          |
| minifySyntax      | `boolean \| undefined`            | Minify syntax.                               |
| target            | `string \| string[] \| undefined` | Target environment for generated code.       |
| analyze           | `boolean \| "verbose"`            | Analyze bundle composition.                  |
| metafile          | `string \| undefined`             | Path to write esbuild metafile for analysis. |

#### `TypeScriptPluginOptions`

Options for `@rnx-kit/metro-plugin-typescript`.

| Name         | Type                   | Description                                          |
| ------------ | ---------------------- | ---------------------------------------------------- |
| throwOnError | `boolean \| undefined` | Whether to throw an exception when validation fails. |
