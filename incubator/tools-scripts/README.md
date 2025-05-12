<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/tools-scripts

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-scripts)](https://www.npmjs.com/package/@rnx-kit/tools-scripts)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

This package provides configurable script implementations, and helpers for
building clipanion based CLIs using these script routines or your own routines.

## Motivation

This provides some shared infrastructure for use in our own CLIs (like the one
in align-deps or @rnx-kit/cli), providing API based implementations for common
JS tasks like linting or building typescript that are often more efficient than
invoking `eslint` or `tsc` via the command line, and gives a place for custom
routines to launch our own tools where needed.

## Installation

```sh
yarn add @rnx-kit/tools-scripts --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-scripts
```

## Usage
