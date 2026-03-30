# @rnx-kit/types-plugin-duplicates-checker

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/types-plugin-duplicates-checker)](https://www.npmjs.com/package/@rnx-kit/types-plugin-duplicates-checker)

TypeScript type definitions for rnx-kit metro bundling plugins.

## Installation

```sh
yarn add @rnx-kit/types-plugin-duplicates-checker --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/types-plugin-duplicates-checker
```

## Usage

```ts
import type { DuplicateDetectorPluginOptions } from "@rnx-kit/types-plugin-duplicates-checker";
```

## Types

### Bundler Plugin Types for duplicate detector plugin

#### `DuplicateDetectorPluginOptions`

Options for `@rnx-kit/metro-plugin-duplicates-checker`.

| Name           | Type                             | Description                                                 |
| -------------- | -------------------------------- | ----------------------------------------------------------- |
| ignoredModules | `readonly string[] \| undefined` | List of modules to ignore when scanning for duplicates.     |
| bannedModules  | `readonly string[] \| undefined` | List of modules that always cause a failure.                |
| throwOnError   | `boolean \| undefined`           | Whether to throw an exception when a duplicate is detected. |
