# @rnx-kit/yarn-plugin-eslint

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/yarn-plugin-eslint)](https://www.npmjs.com/package/@rnx-kit/yarn-plugin-eslint)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This is a Yarn plugin that integrates ESLint and opinionated (but overridable)
defaults, allowing you to run ESLint without having to install/configure it
separately in every workspace.

## Installation

The plugin needs to be installed via `yarn plugin install` command. This needs
to reference the produced bundle out of the `lib` folder.

```sh
yarn plugin import ./path/to/@rnx-kit/yarn-plugin-eslint/lib/index.js
```

## Usage

```sh
yarn rnx-lint
```
