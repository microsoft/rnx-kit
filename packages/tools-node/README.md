# @rnx-kit/tools-node

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-node)](https://www.npmjs.com/package/@rnx-kit/tools-node)

`@rnx-kit/tools-node` is a collection of supplemental NodeJS functions and
types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * from "@rnx-kit/tools-node";

import * from "@rnx-kit/tools-node/fs";
import * from "@rnx-kit/tools-node/module";
import * from "@rnx-kit/tools-node/package";
import * from "@rnx-kit/tools-node/path";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Type Name                    | Description                                                                                                                                                                     |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| module   | FileModuleRef                | Module reference rooted to a file system location, either relative to a directory, or as an absolute path. For example, `./index` or `/repos/rnx-kit/packages/tools/src/index`. |
| module   | PackageModuleRef             | Module reference relative to a package, such as `react-native` or `@rnx-kit/tools/node/index`.                                                                                  |
| package  | FindPackageDependencyOptions | Options which control how package dependecies are located.                                                                                                                      |
| package  | PackageManifest              | Schema for the contents of a `package.json` manifest file.                                                                                                                      |
| package  | PackagePerson                | Schema for a reference to a person in `package.json`.                                                                                                                           |
| package  | PackageRef                   | Components of a package reference.                                                                                                                                              |

| Category | Function                                         | Description                                                                                                                             |
| -------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| fs       | `createDirectory(p)`                             | Create a directory, and all missing parent directories.                                                                                 |
| fs       | `findFirstFileExists(rootDir, ...relativeFiles)` | Combine the root directory with each relative file, testing whether or not the file exists. Stop and return as soon as a file is found. |
| fs       | `isDirectory(p)`                                 | Determine if the target path refers to a directory.                                                                                     |
| fs       | `isFile(p)`                                      | Determine if the target path refers to a file.                                                                                          |
| fs       | `statSync(p)`                                    | Get stats (detailed information) for the target path.                                                                                   |
| module   | `getPackageModuleRefFromModulePath(modulePath)`  | Convert a module path to a package module reference.                                                                                    |
| module   | `isFileModuleRef(r)`                             | Is the module reference relative to a file location?                                                                                    |
| module   | `isPackageModuleRef(r)`                          | Is the module reference a package module reference?                                                                                     |
| module   | `parseModuleRef(r)`                              | Parse a module reference into either a package module reference or a file module reference.                                             |
| package  | `findPackage(startDir)`                          | Find the nearest `package.json` manifest file. Search upward through all parent directories.                                            |
| package  | `findPackageDependencyDir(ref, options)`         | Find the package dependency's directory, starting from the given directory and moving outward, through all parent directories.          |
| package  | `findPackageDir(startDir)`                       | Find the parent directory of the nearest `package.json` manifest file. Search upward through all parent directories.                    |
| package  | `getMangledPackageName(ref)`                     | Get the mangled name for a package reference.                                                                                           |
| package  | `isPackageManifest(manifest)`                    | Determine if the given object is a `package.json` manifest.                                                                             |
| package  | `parsePackageRef(r)`                             | Parse a package reference string. An example reference is the `name` property found in `package.json`.                                  |
| package  | `readPackage(pkgPath)`                           | Read a `package.json` manifest from a file.                                                                                             |
| package  | `writePackage(pkgPath, manifest, space)`         | Write a `package.json` manifest to a file.                                                                                              |
| path     | `escapePath(p)`                                  | Escape a path by replacing each backslash ('\\') with a double-backslash ("\\\\").                                                      |
| path     | `normalizePath(p)`                               | Normalize the separators in a path, converting each backslash ('\\') to a foreward slash ('/').                                         |

<!-- @rnx-kit/api end -->
