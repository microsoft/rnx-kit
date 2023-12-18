# @rnx-kit/tsconfig

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tsconfig)](https://www.npmjs.com/package/@rnx-kit/tsconfig)

`@rnx-kit/tsconfig` is a set of TypeScript configurations for working with Node.

## Install

```
yarn add @rnx-kit/tsconfig --dev
```

or if you're using npm:

```
npm add --save-dev @rnx-kit/tsconfig
```

## Usage

Add the following to your `tsconfig.json`:

```json
"extends": "@rnx-kit/tsconfig/tsconfig.json"
```

Or if you're targeting ESM:

```json
"extends": "@rnx-kit/tsconfig/tsconfig.esm.json"
```
