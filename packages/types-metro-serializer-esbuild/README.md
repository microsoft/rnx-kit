# @rnx-kit/types-metro-serializer-esbuild

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-metro-serializer-esbuild)](https://www.npmjs.com/package/@rnx-kit/types-metro-serializer-esbuild)

TypeScript type definitions for rnx-kit metro bundling plugins.

## Installation

```sh
yarn add @rnx-kit/types-metro-serializer-esbuild --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-metro-serializer-esbuild
```

## Usage

```ts
import type { SerializerEsbuildOptions } from "@rnx-kit/types-metro-serializer-esbuild";
```

## Types

### Bundler Plugin Types

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
