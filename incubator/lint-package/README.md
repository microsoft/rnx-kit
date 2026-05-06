# @rnx-kit/lint-package

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/lint-package)](https://www.npmjs.com/package/@rnx-kit/lint-package)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

A package-level lint helper built on top of
[`@rnx-kit/lint-json`](../lint-json). It wraps a single package's
`package.json` (or a Yarn constraints workspace) in a `PackageValidationContext`
that exposes the same `enforce`/`error`/`finish` surface as `JSONValidator`,
plus utilities for validating sibling JSON files, checking for the presence
of config files, reading the `rnx-kit` config block, and attaching
per-rule state.

## Installation

```sh
yarn add @rnx-kit/lint-package --dev
```

`@yarnpkg/types` is an optional peer dependency. Install it only if you plan
to use `PackageValidationContext.createYarn` from a `yarn.config.js`.

## Usage

### Standalone (linting a directory)

```ts
import { PackageValidationContext } from "@rnx-kit/lint-package";

const ctx = PackageValidationContext.create(packageRoot, {
  fix: process.argv.includes("--fix"),
});

ctx.enforce("license", "MIT");
ctx.enforce("repository.type", "git");
ctx.enforce(["scripts", "build"], "rnx-kit-scripts build");

const tsconfig = ctx.validateJSON("tsconfig.json");
tsconfig?.enforce("compilerOptions.strict", true);

if (ctx.hasFile("CHANGELOG.md")) {
  ctx.enforce(["scripts", "release"], "changeset publish");
}

process.exit(ctx.finish());
```

### Yarn constraints (`yarn.config.js`)

```ts
import { defineConfig } from "@yarnpkg/types";
import { PackageValidationContext } from "@rnx-kit/lint-package";

export default defineConfig({
  async constraints({ Yarn }) {
    for (const workspace of Yarn.workspaces()) {
      const ctx = PackageValidationContext.createYarn(workspace);
      ctx.enforce("license", "MIT");
      ctx.enforce("author.email", "opensource@example.com");
      ctx.finish();
    }
  },
});
```

In Yarn mode, errors are routed to `workspace.error` and reporting is owned
by the Yarn CLI; `finish()` always returns `0`.

## API

### `PackageValidationContext.create(root, options?)`

Creates a context backed by `root/package.json` on disk.

- **`root`** — package directory. Resolved to an absolute path.
- **`options`** — `JSONValidatorOptions` plus an optional `manifest` to
  bypass the disk read when the manifest is already loaded:

  | Option        | Type                        | Default                                  |
  | ------------- | --------------------------- | ---------------------------------------- |
  | `fix`         | `boolean`                   | `false`                                  |
  | `manifest`    | `TManifest`                 | _(loaded from `root/package.json`)_      |
  | `header`      | `string`                    | `"errors in package at <relative root>"` |
  | `footer`      | `string`                    | _(none)_                                 |
  | `reportError` | `(message: string) => void` | `console.error`                          |

### `PackageValidationContext.createYarn(workspace)`

Creates a context that delegates to a `Yarn.Constraints.Workspace`.
`enforce` calls become `workspace.set` / `workspace.unset`; `error` becomes
`workspace.error`. Yarn's own `--fix` flag drives fix mode.

### Properties

- **`ctx.root`** — absolute package path (or `workspace.cwd` in yarn mode).
- **`ctx.manifest`** — typed view of the package manifest (the live object;
  `enforce` mutates it in place in fix mode).
- **`ctx.kitConfig`** — the resolved `rnx-kit` config from the manifest, or
  `{}` when none is present. Cached; auto-invalidated when `enforce` mutates
  any path under `rnx-kit`.
- **`ctx.fix`** / **`ctx.raw`** — read-only passthroughs to the underlying
  `JSONValidator`.

### Methods inherited from `JSONValidator`

- **`enforce(path, value)`** — assert a value at `path`, or remove it when
  `value` is `undefined`. See
  [`@rnx-kit/lint-json`](../lint-json/README.md#validatorenforcepath-value)
  for path syntax and the prototype-pollution block.
- **`error(message)`** — record a custom error.
- **`finish()`** — `0` on success, `1` if anything was recorded. Aggregates
  exit codes from any sibling validators created via `validateJSON`. In fix
  mode and standalone mode, the manifest (and any dirty sibling JSON files)
  is written to disk before returning.

### `ctx.validateJSON(jsonPath)`

Returns a `JSONValidator` for a sibling JSON file relative to the package
root, or `null` if the file does not exist. Errors from sibling validators
are aggregated into the outer `finish()`. Calling `validateJSON` for the
same path twice returns the same delegate validator.

### `ctx.hasFile(filePath)` / `ctx.findJSConfig(baseName)`

Cached existence checks against the package root.

- `hasFile("README.md")` → boolean.
- `findJSConfig("metro.config")` → resolves the first of `.js`, `.cjs`,
  `.mjs`, `.ts`, or returns `undefined`.

### `ctx.attach(key, factory)`

Per-rule scratch space keyed by `Symbol`. The factory runs once per key on
first call; subsequent calls with the same key return the cached value. The
factory receives the context as its argument.

```ts
const STATE = Symbol("my-rule");
const state = ctx.attach(STATE, (base) => ({ visited: new Set<string>() }));
```

## Notes

- The constructor is `protected`; always go through `create` or `createYarn`.
- `createYarn` reads `--fix` from `process.argv` (Yarn's own flag) on first
  call and caches the result for the rest of the process.
- Sibling validator output is rendered as a tree, and that tree string is
  itself nested into the outer package report — expect a tree-of-trees in
  multi-file failures.
