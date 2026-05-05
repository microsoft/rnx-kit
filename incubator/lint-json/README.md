# @rnx-kit/lint-json

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/lint-json)](https://www.npmjs.com/package/@rnx-kit/lint-json)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A small library for asserting and fixing values in a JSON file. Build your own
linter on top of it — declare what should be at a path, run in validation mode
to report drift, or in fix mode to write the corrected file back to disk.

## Installation

```sh
yarn add @rnx-kit/lint-json --dev
```

## Usage

```ts
import { createJSONValidator } from "@rnx-kit/lint-json";

const validator = createJSONValidator("package.json", undefined, {
  fix: process.argv.includes("--fix"),
});

validator.enforce("license", "MIT");
validator.enforce("repository.type", "git");
validator.enforce(["scripts", "build"], "rnx-kit-scripts build");
validator.enforce("private", undefined); // remove the property

process.exit(validator.finish());
```

In validation mode (the default), mismatches and missing values are collected
and reported as a tree on `finish()`, which returns `1`. In fix mode, the same
mismatches are applied to the in-memory object and the file is rewritten;
`finish()` returns `0`.

## API

### `createJSONValidator(jsonPath, json?, options?)`

- **`jsonPath`** — path to the JSON file. Used in default error headers and as
  the write target in fix mode.
- **`json`** — the parsed object to validate. If omitted, the file at
  `jsonPath` is read from disk.
- **`options`** — see below. All optional.

| Option        | Type                        | Default                              |
| ------------- | --------------------------- | ------------------------------------ |
| `fix`         | `boolean`                   | `false`                              |
| `header`      | `string`                    | `"errors in: <relative path>"`       |
| `footer`      | `string`                    | _(none)_                             |
| `reportError` | `(message: string) => void` | `console.error`                      |

### `validator.enforce(path, value)`

Asserts that `path` resolves to `value`. If it doesn't:

- in validation mode, an error is recorded;
- in fix mode, intermediate objects are created as needed and the value is
  written.

`path` is either a dotted string (`"dependencies.react"`) or an array
(`["exports", ".", "import"]`). Use an array when keys may contain dots.

Passing `undefined` for `value` removes the property at `path`.

### `validator.error(message)`

Records an arbitrary error. `finish()` will return `1` even if no `enforce`
calls failed.

### `validator.finish()`

Returns `0` on success, `1` if any errors were recorded. In fix mode, writes
the file before returning if any changes were made.

## Notes

- **Object key order is significant.** Two objects with the same keys in a
  different order are treated as unequal. In fix mode this causes a rewrite
  with the desired key order — useful for keeping `package.json` fields
  ordered, but be aware of it.
- **Prototype-pollution paths are blocked.** Any path containing `__proto__`,
  `constructor`, or `prototype` throws from `enforce`.
