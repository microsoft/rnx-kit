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
yarn add @rnx-kit/tools-packages --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-packages
```

## Usage

There are two main parts of this package, helpers for retrieving package info
and helpers for accessors.

### Types

| Type Name                  | Description                                                                                                                                                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PlatformInfo`             | Main returned type for the module. This contains information about the package name, root package path, the loaded package.json in `Manifest` form, whether or not the package is a workspace, as well as a `symbol` based index signature for attaching additional information to the type. |
| `GetPackageValue<T>`       | Format for a value accessor, used when creating accessors that only need to be loaded once.                                                                                                                                                                                                  |
| `PackageValueAccessors<T>` | Typed has/get/set methods to access values attached to the `PackageInfo` when they may be updated.                                                                                                                                                                                           |

### Functions

| Function                       | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getPackageInfoFromPath`       | Given a path to either the root folder of a package, or the package.json for that package, return a loaded `PackageInfo` for that package. This will attempt to look up the package in the cache, loading it if not found. It will throw an exception on an invalid path.                                                                                                                                          |
| `getPackageInfoFromWorkspaces` | Try to retrieve a `PackageInfo` by name. This only works for in-workspace packages as module resolution outside of that scope is more complicated. Note that by default this only finds packages previously cached. If the optional boolean parameter is set to true, in the case that the package is not found, all workspaces will be loaded into the cache. This can be expensive though it is a one time cost. |
| `getRootPackageInfo`           | Get the package info for the root of the workspaces                                                                                                                                                                                                                                                                                                                                                                |
| `createPackageValueLoader<T>`  | Create a function which retrieves a cached value from `PackageInfo` calling the initializer function if it hasn't been loaded yet. This creates an internal symbol for to make the access unique with the supplied friendly name to make debugging easier.                                                                                                                                                         |
| `createPackageValueAccessors`  | Create three typed functions matching the has/get/set signature associated with a new and contained symbol. This is for accessors that may need to change over time.                                                                                                                                                                                                                                               |
