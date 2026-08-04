# @rnx-kit/prettier-oxfmt

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/prettier-oxfmt)](https://www.npmjs.com/package/@rnx-kit/prettier-oxfmt)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

`@rnx-kit/prettier-oxfmt` is a **mock-up** of a shim layer that lets
[`oxfmt`](https://oxc.rs/docs/guide/usage/formatter/cli.html) stand in for
[Prettier](https://prettier.io/) on the command line. It exposes a `prettier`
binary whose accepted flags match Prettier's, translates them into the
equivalent `oxfmt` invocation, and delegates the actual formatting to `oxfmt`.

The goal is a drop-in replacement good enough for editor integrations — chiefly
the [VS Code Prettier extension](https://github.com/prettier/prettier-vscode)
(`esbenp.prettier-vscode`) — without pulling in Prettier itself.

## Assumptions

This mock-up is built on two assumptions from the design brief:

1. **All formatting configuration lives in JSON config files** (`.oxfmtrc.json`
   or `.prettierrc`). Style options (print width, quotes, semicolons, parser,
   …) are therefore **never** accepted on the command line.
2. **Only a subset of flags is needed** — enough for editor plugins and CI to
   work, not the entire Prettier CLI.

## What maps directly vs. what we reimplement

The full mapping lives in [`src/flags.ts`](./src/flags.ts). Summary:

### 1. Direct pass-through (oxfmt accepts an identical flag)

| Prettier flag                     | oxfmt flag                        | Notes                                                        |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `--check`                         | `--check`                         | Exit non-zero if files are not formatted.                    |
| `--write`                         | `--write`                         | Format in place. See _Default mode_ below.                   |
| `--list-different` / `-l`         | `--list-different`                | List files that would change.                                |
| `--stdin-filepath <path>`         | `--stdin-filepath <path>`         | How editors format an unsaved buffer; parser inferred.       |
| `--config <path>` / `-c`          | `--config <path>` / `-c`          | Explicit config file.                                        |
| `--ignore-path <path>`            | `--ignore-path <path>`            | Custom ignore file(s); repeatable.                           |
| `--no-error-on-unmatched-pattern` | `--no-error-on-unmatched-pattern` | Don't fail on empty globs.                                   |
| `--with-node-modules`             | `--with-node-modules`             | Include `node_modules`.                                      |
| `--version` / `-V`, `--help`/`-h` | same                              | Version/help.                                                |
| file paths / globs / `-`          | same                              | Positional arguments pass through unchanged.                 |

### 2. Renamed (same concept, different spelling)

| Prettier flag | oxfmt flag                | Notes                                                                                 |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `--no-config` | `--disable-nested-config` | Closest oxfmt switch for suppressing config discovery (disables the nested-dir search). |

### 3. Reimplemented in the shim (no oxfmt CLI equivalent, editors depend on it)

These are Prettier-only CLI features that the VS Code extension may call to
decide whether/how to format a file. oxfmt exposes no matching flag, so the shim
answers them itself (currently stubbed — see [`src/cli.ts`](./src/cli.ts)):

| Prettier flag              | Why it must be reimplemented                                             |
| -------------------------- | ------------------------------------------------------------------------ |
| `--file-info <path>`       | Reports `{ ignored, inferredParser }`; used to skip ignored files.       |
| `--find-config-path <path>`| Reports which config governs a path.                                     |
| `--support-info`           | Emits supported languages/options as JSON.                               |

Additionally, one behaviour is reimplemented even for the directly-mapped flags:

- **Default mode.** Prettier with no `--check`/`--write` is a no-op that prints
  to stdout, whereas `oxfmt`'s default is to **write files in place**. To avoid
  destructive surprises, the shim requires an explicit `--check`, `--write`, or
  `--list-different` whenever file paths are supplied.

### 4. Accepted but ignored (compatibility no-ops)

`--color` / `--no-color`, `--cache` / `--no-cache` / `--cache-location` /
`--cache-strategy`, and `--log-level` / `--loglevel` are accepted so the shim
stays drop-in, but have no oxfmt equivalent and are dropped.

### 5. Explicitly rejected (per assumption 1)

Every Prettier style flag — `--print-width`, `--tab-width`, `--use-tabs`,
`--semi`/`--no-semi`, `--single-quote`, `--trailing-comma`, `--arrow-parens`,
`--parser`, `--plugin`, etc. — is rejected with an explanatory error, because
all formatting configuration must come from the JSON config file. Unknown flags
are rejected too, rather than being silently forwarded.

## Installation

```sh
yarn add @rnx-kit/prettier-oxfmt --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/prettier-oxfmt
```

## Usage

The package installs a `prettier` binary. Point your editor's Prettier extension
at it (e.g. via `prettier.prettierPath`) or invoke it directly:

```sh
prettier --check "src/**/*.ts"
prettier --write src
cat foo.ts | prettier --stdin-filepath foo.ts
```

Programmatic access to the translation layer is also exported:

```ts
import { translate } from "@rnx-kit/prettier-oxfmt";

translate(["--check", "src"]);
// => { type: "forward", args: ["--check", "src"] }
```

## Status

This is a **mock-up**. The flag translation and its tests are real, but the
Prettier-only shim flags (`--file-info`, `--find-config-path`,
`--support-info`) are stubbed, and the CLI shells out to whatever `oxfmt` is on
`PATH` (override with the `OXFMT_BIN` environment variable).
