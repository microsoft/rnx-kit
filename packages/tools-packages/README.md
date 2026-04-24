# @rnx-kit/tools-packages

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-packages)](https://www.npmjs.com/package/@rnx-kit/tools-packages)

This package provides utilities for working with npm packages from Node.js
tooling. It covers three areas:

- **Package info** — load and cache `PackageInfo` for a package by path or by
  workspace name, with helpers for attaching custom data to the cached entry
  via symbol-keyed accessors.
- **Package contexts** — build a `PackageContext` from a root directory, and
  optionally extend it into a `PackageValidationContext` that can validate or
  fix the package's `package.json`.
- **JSON validator** — a standalone `JSONValidator` for any JSON document that
  reports differences (or applies them as fixes) at given paths, with optional
  file-write-on-finish behavior. The same surface drives both standalone
  validation and the Yarn constraints adapter.

## Motivation

While loading `package.json` is pretty quick, it quickly becomes redundant when
multiple tools in rnx-kit each need to read the same file. This package adds a
caching layer so the work is done once.

Tools also frequently need to enforce the same rules on `package.json` —
sometimes as a CI check (report-only) and sometimes as a fix-up step. The
`JSONValidator` API lets a single piece of validation code run in either mode,
and the `createYarnWorkspaceContext` adapter lets the same code be wired into
Yarn constraints without changes.

## Installation

```sh
yarn add @rnx-kit/tools-packages --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/tools-packages
```

## Usage

### Package info

```ts
import {
  createPackageValueLoader,
  getPackageInfoFromPath,
} from "@rnx-kit/tools-packages";

const getTsConfigPath = createPackageValueLoader("tsconfigPath", (pkg) => {
  const candidate = path.join(pkg.root, "tsconfig.json");
  return fs.existsSync(candidate) ? candidate : undefined;
});

const pkg = getPackageInfoFromPath("/path/to/some/package");
const tsconfig = getTsConfigPath(pkg); // computed once, cached on pkg
```

### Package validation

```ts
import { createPackageValidationContext } from "@rnx-kit/tools-packages";

const ctx = createPackageValidationContext("/path/to/pkg", undefined, {
  fix: process.argv.includes("--fix"),
  reportPrefix: "[my-tool] ",
});
ctx.enforce("license", "MIT");
ctx.enforce(["scripts", "build"], "rnx-kit-scripts build");
const { changes, errors } = ctx.finish();
```

When `fix` is true and a `jsonFilePath` is set (the validation context infers
this from the package root), `finish()` writes the updated `package.json` back
to disk.

### Yarn constraints

The same validation code can run inside a Yarn constraints file by adapting
the workspace object Yarn provides:

```ts
import { createYarnWorkspaceContext } from "@rnx-kit/tools-packages";

export default {
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      const ctx = createYarnWorkspaceContext(workspace);
      ctx.enforce("license", "MIT");
    }
  },
};
```

### Types

| Type                         | Description                                                                                                                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PackageContext<TManifest>`  | Basic package information: `name`, fully resolved `root`, the loaded `manifest`, plus a symbol index signature for attaching additional information to the context.                                         |
| `PackageInfo`                | A `PackageContext` returned from the cached lookup helpers. Adds an optional `workspace` flag indicating whether the package is part of the current workspace.                                              |
| `PackageValidationContext`   | `PackageContext & JSONValidator`. The package context augmented with `enforce` / `error` / `changed` / `finish` for validating or fixing the `package.json`.                                                |
| `JSONValidator`              | The validation surface used by both standalone and yarn-mode validators. See the function table below.                                                                                                      |
| `JSONValidatorOptions`       | Options accepted by `createJSONValidator`: `fix`, `jsonFilePath`, `reportError`, `reportPrefix`. All optional; missing values fall back to the module-level defaults set via `setDefaultValidationOptions`. |
| `JSONValidationResult`       | Result returned from `finish()`: `{ changes: boolean; errors: boolean }`.                                                                                                                                   |
| `JSONValuePath`              | `string \| string[]`. A dotted string is split into segments; an array form lets segments contain literal `.` characters (e.g. `["exports", ".", "import"]`).                                               |
| `JSONValue`                  | Recursive JSON value type — primitives, arrays, or `Record<string, unknown>`.                                                                                                                               |
| `GetPackageValue<T>`         | Single-function accessor produced by `createPackageValueLoader`. Always returns `T` because the loader initializes the value on first access.                                                               |
| `PackageValueAccessors<T>`   | `has` / `get` / `set` accessors produced by `createPackageValueAccessors`. `get` returns `T \| undefined` since the value may not have been set.                                                            |
| `ObjectValueAccessors<O, V>` | Generalized form of `PackageValueAccessors` for any object type, produced by `createObjectValueAccessors`.                                                                                                  |

### Package info functions

| Function                       | Description                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getPackageInfoFromPath`       | Given a path to a package root or its `package.json`, returns a cached `PackageInfo`. Loads the package the first time it is seen. Throws if the path is not a valid package.                                                                                                                                     |
| `findPackageInfo`              | Walks up from the start path (or `process.cwd()` if none is given) to the nearest `package.json` and returns the cached `PackageInfo` for it.                                                                                                                                                                     |
| `getPackageInfoFromWorkspaces` | Looks up a `PackageInfo` by package name. Only resolves packages that are part of the current workspace. By default it only consults the cache; pass `true` as the second argument to load all workspace packages into the cache on a miss. The full load is a one-time cost but can be expensive in large repos. |

### Context functions

| Function                         | Description                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createPackageContext`           | Build a `PackageContext` from a root directory. Reads `package.json` from disk unless a manifest is supplied. The root path is resolved to an absolute path.                                                                                                 |
| `createPackageValidationContext` | Build a `PackageValidationContext` from a root directory. Sets `jsonFilePath` to `<root>/package.json` so `finish()` will write changes when `fix` is enabled.                                                                                               |
| `asPackageValidationContext`     | Promote an existing `PackageContext` to a `PackageValidationContext`. If the supplied context is already a validator (recognized via brand symbol) the same instance is returned unchanged — fix mode and reporter on the existing validator are preserved.  |
| `createYarnWorkspaceContext`     | Adapt a Yarn `Workspace` (as exposed via Yarn constraints) into a `PackageValidationContext`. `enforce` is routed to `workspace.set` / `workspace.unset` and `error` is routed to `workspace.error`. `changed` and `finish` are no-ops — Yarn manages those. |

### JSON validator functions

| Function                      | Description                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createJSONValidator`         | Wrap a JSON object as a `JSONValidator`. `enforce(path, value)` reports or applies a difference depending on `fix`; `enforce(path, undefined)` removes a value. An optional `baseObj` mixes the validator methods onto an existing object. When `fix` is true and `jsonFilePath` is provided, `finish()` writes the file. |
| `isJSONValidator`             | Brand-symbol check for objects produced by `createJSONValidator`. Plain objects with a matching shape are not recognized.                                                                                                                                                                                                 |
| `compareValues`               | Deep equality for JSON-shaped values. Object keys are compared with order significance (since JSON files have a meaningful key order on disk).                                                                                                                                                                            |
| `setDefaultValidationOptions` | Set process-wide defaults for `fix`, `reportError`, and `reportPrefix`. Useful for wiring CLI flags once at startup. Per-call options always take precedence.                                                                                                                                                             |

### Accessor functions

| Function                      | Description                                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createPackageValueLoader<T>` | Returns a single function which retrieves a value from a `PackageInfo`, calling the supplied initializer the first time and caching the result on the context. The result is keyed by a fresh symbol; the friendly name is used only for debugging. |
| `createPackageValueAccessors` | Returns a `{ has, get, set }` triple for storing values that may change over time on a `PackageInfo`. Backed by a fresh symbol per call.                                                                                                            |
| `createObjectValueAccessors`  | Like `createPackageValueAccessors` but generic over the host object type — useful for attaching internal state to any object that has a string-or-symbol index signature.                                                                           |

### `JSONValidator` methods

| Method                 | Description                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enforce(path, value)` | If `value` is a JSON value and the document differs, either applies the change (fix mode) or reports an error. If `value` is `undefined`, removes the property at `path` (fix mode) or reports its presence (non-fix mode). |
| `error(message)`       | Report a custom validation error. Sets the `errors` flag on the result.                                                                                                                                                     |
| `changed()`            | Mark that an out-of-band change was made to the underlying JSON. Sets the `changes` flag on the result so the file will be written on `finish()` when in fix mode.                                                          |
| `finish()`             | Returns `{ changes, errors }`. In fix mode, when `jsonFilePath` is set and `changes` is true, writes the JSON file before returning.                                                                                        |
