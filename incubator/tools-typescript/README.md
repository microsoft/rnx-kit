<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/tools-typescript

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-typescript)](https://www.npmjs.com/package/@rnx-kit/tools-typescript)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A package that helps with building typescript, particularly for react-native. It
leverages the @rnx-kit/typescript-service package to build using the language
service rather than using the compiler directly. This allows for custom
resolution strategies (among other things). The compilation and type-checking
are still done by typescript but this drives some convenient custom
configurations.

In particular the `buildTypescript` command can do things like:

- multiplex a build in a directory, to build for multiple react-native platforms
  at the same time. The files will be split such that the minimal build can be
  performed.
- detect which react-native platforms should be built based on rnx-kit bundle
  configs or react-native.config.js settings.
- successfully build with the module suffixes without throwing up a ton of bogus
  unresolved reference errors.
- share caches where possible to speed up compilations within the same node
  process.

## Motivation

The current story for building typescript for react-native is sub-par, and
typescript itself is particularly restrictive with module resolution. This
addresses the ability to build react-native better right now, but also creates a
framework for experimenting with different resolvers.

## Installation

```sh
yarn add @rnx-kit/tools-typescript --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-typescript
```

## Usage

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Type Name    | Description                               |
| -------- | ------------ | ----------------------------------------- |
| types    | PlatformInfo | Information about each available platform |

| Category  | Function                                     | Description                                                                                                   |
| --------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| build     | `buildTypescript(options)`                   | Execute a build (or just typechecking) for the given package                                                  |
| platforms | `parseSourceFileDetails(file, ignoreSuffix)` | Take a file path and return the base file name, the platform extension if one exists, and the file extension. |
| reporter  | `createReporter(name, logging, tracing)`     | Create a reporter that can log, time, and report errors                                                       |

<!-- @rnx-kit/api end -->
