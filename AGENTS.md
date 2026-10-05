# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

`rnx-kit` is a monorepo of React Native tooling created by Microsoft. It
provides battle-tested tools for dependency management, Metro bundling
enhancements, TypeScript integration, and cross-platform development (iOS,
Android, macOS, Windows).

## Repository Structure

- **`packages/`** - Stable, published packages (e.g., `@rnx-kit/cli`,
  `@rnx-kit/align-deps`, `@rnx-kit/metro-*`)
- **`incubator/`** - Experimental packages (marked with `"experimental": true`
  in package.json)
- **`scripts/`** - Internal build tooling (`rnx-kit-scripts` CLI)
- **`docsite/`** - Documentation website (separate Yarn workspace with its own
  `yarn.lock`; **not** in root `workspaces`)
- **`.changeset/`** - Changeset configuration for versioning

## Build System

Uses **Nx** for task orchestration with **Yarn Berry** workspaces. Node linker
is `pnpm`. Required Node.js version: see `engines.node` in the root
`package.json`.

`rnx-kit-scripts build` runs the `tsc` binary from `typescript` (version: see
`catalog.typescript` in `.yarnrc.yml`). In Nx, `build` depends on `lint`, so
building a package also lints it.

### Key Commands (Repository Root)

```sh
yarn                    # Install dependencies
yarn build              # Build all packages
yarn build-scope <pkg>  # Build specific package with dependencies (e.g., yarn build-scope @rnx-kit/cli)
yarn test               # Build and test all packages
yarn lint               # Lint all packages
yarn format             # Format all packages
yarn clean              # Clean build artifacts (git clean)
yarn show-affected      # Show affected projects
yarn update-readme      # Regenerate API docs in READMEs (TypeDoc)
```

### Package-Level Commands

```sh
yarn build                 # Build current package only
yarn build --dependencies  # Build current package and its dependencies
yarn test                  # Run tests
yarn lint                  # Lint current package
yarn format                # Format current package
```

### Running Tests

- **Default test runner**: Node.js built-in test runner (`node:test`) — most
  packages use this
- **Jest**: Used only by packages that have a `"jest"` field in `package.json`
  or a `jest.config.js` (see `useJest()` in `scripts/src/commands/test.js`)
- The `rnx-kit-scripts test` command auto-detects which runner to use
- Tests live in `test/` directories with `.test.ts` (or `.test.mts` for ESM)
  extension
- Run specific test: `yarn test path/to/file.test.ts` (from package directory)

Node test runner style:

```typescript
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
```

### Test Patterns

- Coverage, or passing arguments to `yarn test`: see how the default test glob
  is applied in `scripts/src/commands/test.js`
- Source files that use bare `require`: see
  `packages/tools-react-native/test/metro.test.mts`
- Modules with a `require.main === module` guard: see
  `packages/third-party-notices/test/index.test.ts`
- Code that reads or writes files: use `@rnx-kit/tools-filesystem/mocks`
  (see `packages/tools-filesystem/src/mockfs/index.ts` and
  `packages/cli/test/bundle/metro.test.ts` for usage)
- Fixtures that need a `node_modules` folder: see the `__fixtures__` exception
  in the root `.gitignore`
- Do not override globals or system values in tests (e.g. `process.platform`)
  unless absolutely necessary, such as setting `global.require` for sources
  loaded as ESM (see `packages/tools-react-native/test/metro.test.mts` for how
  to set it in `before()` and restore it in `after()`)

### CI Commands

```sh
yarn build:ci            # Build and test affected packages
yarn build:ci:all        # Build and test ALL packages
yarn bundle:ci           # Bundle affected packages
yarn change:check        # Verify change files exist (CI passes --since origin/<base>)
```

## Package Conventions

- Each package uses `rnx-kit-scripts` for build/test/lint/format commands
- TypeScript source in `src/`, compiled output in `lib/`
- Entry point typically at `src/index.ts`
- Standard dev dependencies: `@rnx-kit/scripts`, `@rnx-kit/tsconfig`
- `@rnx-kit/jest-preset` is only added when a package uses Jest (not default)
- Packages share the root lint configuration; a package may override it with its
  own config (see `scripts/src/commands/lint.js` for which tool and config files
  are used)
- Many published packages use a `"typescript"` export condition pointing to
  `src/index.ts` for development
- Files named `types.ts` may only contain type exports (enforced by the
  `type-definitions-only` lint rule)

## Creating New Packages

```sh
yarn new-package <name>                 # Creates in packages/
yarn new-package <name> --experimental  # Creates in incubator/
```

Uses `packages/template` as baseline; see `scripts/new-package.ts` for the
initial version and other manifest fields it sets. Adds an experimental banner
for incubator packages.

## Change Management

Uses [Changesets](https://github.com/changesets/changesets) for versioning:

```sh
yarn change              # Create change file for PR
```

One change file per feature/fix. No need for multiple entries when addressing PR
feedback. Releases are automated via CI — on merge to `main`, the changesets
action creates a release PR or publishes to npm.

Ignored packages (no changesets needed): `@rnx-kit/ignore`, `@rnx-kit/template`,
test apps.

## Key Packages

- **`@rnx-kit/cli`** - Main CLI (`rnx-cli`) integrating all tools
- **`@rnx-kit/align-deps`** - Dependency version alignment across repos
- **`@rnx-kit/metro-*`** - Metro bundler plugins (TypeScript, config,
  tree-shaking, duplicate detection, cyclic deps)
- **`@rnx-kit/tools-*`** - Platform-specific utilities (android, apple, node,
  react-native, filesystem, shell, workspaces, etc.)
- **`@rnx-kit/config`** - Configuration loading from `package.json` `rnx-kit`
  field
- **`@rnx-kit/eslint-plugin`** - Custom lint rules (see
  `packages/eslint-plugin/src/rules/` for the current list)
- **`@rnx-kit/oxlint-config`** - Shared oxlint config;
  `packages/oxlint-config/private.ts` is the config used by this repo
- **`@rnx-kit/eslint-config`** - ESLint config published for consumers; not
  used to lint this repo
- **`@rnx-kit/typescript-react-native-resolver`** - TypeScript resolver for
  React Native

## Dependency Alignment

The repo uses `align-deps` to maintain consistent dependency versions. Run from
root:

```sh
yarn rnx-align-deps --write  # Fix misaligned dependencies
```

## Quality Checks

These all run in CI and should pass before merging:

```sh
yarn format                        # Formatting
yarn lint                          # Linting
yarn rnx-align-deps --write        # Dependency alignment
yarn constraints --fix             # Yarn constraints (consistent author, homepage, repository fields)
yarn knip                          # Detect unused dependencies
yarn dedupe --check                # Prevent package duplicates in lockfile
node scripts/lint-tsconfig.ts      # Validate TypeScript configs
node scripts/lint-node-version.ts  # Prevent lowering minimum Node versions
yarn update-readme                 # Regenerate API docs
```

CI uses `suggestion-bot` to post code review suggestions for format,
constraints, align-deps, and readme issues.

## Housekeeping

- When triaging issues, ignore the issue titled "Dependency Dashboard" (opened
  by Renovate). It tracks dependency updates (see `.github/renovate.json`) and
  is not a real bug or feature request.

## Platform-Specific Notes

- **Test apps**: `packages/test-app` (iOS/Android), `packages/test-app-macos`,
  `packages/test-app-windows`
- Native builds require platform toolchains (Xcode, Android Studio, Visual
  Studio)
- CocoaPods installation is handled in CI via `microsoft/react-native-test-app`
  GitHub actions

## Code Style

- Run `yarn format` and `yarn lint` before committing (CI enforces both)
- Don't format or lint by hand or call the underlying tools directly — the
  `rnx-kit-scripts format` and `lint` commands (`scripts/src/commands/`) decide
  which tools and configs are used
- The formatter also sorts imports and `package.json` fields
