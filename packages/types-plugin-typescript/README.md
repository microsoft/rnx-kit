# @rnx-kit/types-plugin-typescript

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-plugin-typescript)](https://www.npmjs.com/package/@rnx-kit/types-plugin-typescript)

TypeScript type definitions for rnx-kit metro bundling plugins.

## Installation

```sh
yarn add @rnx-kit/types-plugin-typescript --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-plugin-typescript
```

## Usage

```ts
import type { TypeScriptPluginOptions } from "@rnx-kit/types-plugin-typescript";
```

## Types

### Bundler Plugin Types for typescript plugin

#### `TypeScriptPluginOptions`

Options for `@rnx-kit/metro-plugin-typescript`.

| Name         | Type                   | Description                                          |
| ------------ | ---------------------- | ---------------------------------------------------- |
| throwOnError | `boolean \| undefined` | Whether to throw an exception when validation fails. |
