<!-- We recommend an empty change log entry for a new package: `yarn change --empty` -->

# @rnx-kit/tools-packages

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-packages)](https://www.npmjs.com/package/@rnx-kit/tools-packages)

This package has utilities for loading base information about packages,
retrieved in a `PackageInfo` type, with a layer of caching that happens
automatically, as well as the ability to store additional custom values in the
retrieved `PackageInfo`

## Motivation

While loading package.json is pretty quick, this can quickly end up being a
redundant operation as there different packages in rnx-kit all need different
information from the file. This adds a simple caching layer for retrieving
packages so work is not done multiple times.

The packages can also have custom accessors defined that allow storing of
additional data in the `PackageInfo` and because of that, associated with that
package in the cache. This might be loading the `KitConfig` parsing and
validating a tsconfig.json file. This package doesn't need to care what is being
stored, other packages can add their custom accessors as needed.

## Installation

```sh
yarn add @rnx-kit/tools-package --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-package
```

## Usage
