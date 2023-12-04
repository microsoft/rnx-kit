# @rnx-kit/tools-node

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-node)](https://www.npmjs.com/package/@rnx-kit/tools-node)

`@rnx-kit/tools-node` is a collection of supplemental NodeJS functions and
types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * as tools from "@rnx-kit/tools-node";

// Alternatively...
import * as moduleTools from "@rnx-kit/tools-node/module";
import * as packageTools from "@rnx-kit/tools-node/package";
import * as pathTools from "@rnx-kit/tools-node/path";
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

| Category | Function                                        | Description                                                                                                                    |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| module   | `getPackageModuleRefFromModulePath(modulePath)` | Convert a module path to a package module reference.                                                                           |
| module   | `isFileModuleRef(r)`                            | Is the module reference relative to a file location?                                                                           |
| module   | `isPackageModuleRef(r)`                         | Is the module reference a package module reference?                                                                            |
| module   | `parseModuleRef(r)`                             | Parse a module reference into either a package module reference or a file module reference.                                    |
| package  | `findPackage(startDir)`                         | Find the nearest `package.json` manifest file. Search upward through all parent directories.                                   |
| package  | `findPackageDependencyDir(ref, options)`        | Find the package dependency's directory, starting from the given directory and moving outward, through all parent directories. |
| package  | `findPackageDir(startDir)`                      | Find the parent directory of the nearest `package.json` manifest file. Search upward through all parent directories.           |
| package  | `parsePackageRef(r)`                            | Parse a package reference string. An example reference is the `name` property found in `package.json`.                         |
| package  | `readPackage(pkgPath)`                          | Read a `package.json` manifest from a file.                                                                                    |
| package  | `resolveDependencyChain(chain, startDir)`       | Resolve the path to a dependency given a chain of dependencies leading up to it.                                               |
| package  | `writePackage(pkgPath, manifest, space)`        | Write a `package.json` manifest to a file.                                                                                     |
| path     | `findUp(names, options)`                        | Finds the specified file(s) or directory(s) by walking up parent directories.                                                  |
| path     | `normalizePath(p)`                              | Normalize the separators in a path, converting each backslash ('\\') to a foreward slash ('/').                                |

<!-- @rnx-kit/api end -->
