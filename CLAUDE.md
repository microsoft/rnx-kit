# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`rnx-kit` is a monorepo of React Native tooling created by Microsoft. It provides battle-tested tools for dependency management, Metro bundling enhancements, TypeScript integration, and cross-platform development (iOS, Android, macOS, Windows).

## Repository Structure

- **`packages/`** - Stable, published packages (e.g., `@rnx-kit/cli`, `@rnx-kit/align-deps`, `@rnx-kit/metro-*`)
- **`incubator/`** - Experimental packages (marked with `"experimental": true` in package.json)
- **`scripts/`** - Internal build tooling (`rnx-kit-scripts` CLI)
- **`docsite/`** - Documentation website (separate Yarn workspace with its own `yarn.lock`; **not** in root `workspaces`)
- **`.changeset/`** - Changeset configuration for versioning

## Build System

Uses **Nx** (`20.3.x`) for task orchestration with **Yarn Berry** (`4.10.x`) workspaces. Node linker is `pnpm`. Requires Node.js `>=18.12`.

TypeScript compilation uses `@typescript/native-preview` (`tsgo`) by default. The `--with-tsc` flag falls back to standard `tsc` (only `metro-config` uses this).

### Key Commands (Repository Root)

```sh
yarn                     # Install dependencies
yarn build               # Build all packages
yarn build-scope <pkg>   # Build specific package with dependencies (e.g., yarn build-scope @rnx-kit/cli)
yarn test                # Build and test all packages
yarn lint                # Lint all packages
yarn format              # Format all packages with Prettier
yarn clean               # Clean build artifacts (git clean)
yarn show-affected       # Show affected projects
yarn update-readme       # Regenerate API docs in READMEs (TypeDoc)
```

### Package-Level Commands

```sh
yarn build               # Build current package only
yarn build --dependencies # Build current package and its dependencies
yarn test                # Run tests
yarn lint                # Lint current package
yarn format              # Format current package
```

### Running Tests

- **Default test runner**: Node.js built-in test runner (`node:test`) — most packages use this
- **Jest**: Used by ~7 packages that have `"jest"` in `package.json` or a `jest.config.js`
- The `rnx-kit-scripts test` command auto-detects which runner to use
- Tests live in `test/` directories with `.test.ts` extension
- Run specific test: `yarn test path/to/file.test.ts` (from package directory)

Node test runner style:
```typescript
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
```

### CI Commands

```sh
yarn build:ci            # Build and test affected packages
yarn build:ci:all        # Build and test ALL packages
yarn bundle:ci           # Bundle affected packages
yarn change:check        # Verify change files exist for modified packages
```

## Package Conventions

- Each package uses `rnx-kit-scripts` for build/test/lint/format commands
- TypeScript source in `src/`, compiled output in `lib/`
- Entry point typically at `src/index.ts`
- Standard dev dependencies: `@rnx-kit/eslint-config`, `@rnx-kit/scripts`, `@rnx-kit/tsconfig`
- `@rnx-kit/jest-preset` is only added when a package uses Jest (not default)
- `eslint.config.js` re-exports `@rnx-kit/eslint-config`
- Published packages use a `"typescript"` export condition pointing to `src/index.ts` for development
- Files named `types.ts` enforce the `@rnx-kit/type-definitions-only` ESLint rule (only type exports allowed)

## Creating New Packages

```sh
yarn new-package <name>              # Creates in packages/
yarn new-package <name> --experimental # Creates in incubator/
```

Uses `packages/template` as baseline. Sets version to `0.0.1`, adds experimental banner for incubator packages.

## Change Management

Uses [Changesets](https://github.com/changesets/changesets) for versioning:

```sh
yarn change              # Create change file for PR
```

One change file per feature/fix; no need for multiple entries when addressing PR feedback. Releases are automated via CI — on merge to `main`, the changesets action creates a release PR or publishes to npm.

Ignored packages (no changesets needed): `@rnx-kit/ignore`, `@rnx-kit/template`, test apps.

## Key Packages

- **`@rnx-kit/cli`** - Main CLI (`rnx-cli`) integrating all tools
- **`@rnx-kit/align-deps`** - Dependency version alignment across repos
- **`@rnx-kit/metro-*`** - Metro bundler plugins (TypeScript, config, tree-shaking, duplicate detection, cyclic deps)
- **`@rnx-kit/tools-*`** - Platform-specific utilities (android, apple, node, react-native, filesystem, shell, workspaces, etc.)
- **`@rnx-kit/config`** - Configuration loading from `package.json` `rnx-kit` field
- **`@rnx-kit/eslint-plugin`** - Custom ESLint rules (`no-foreach-with-captured-variables`, `type-definitions-only`)
- **`@rnx-kit/typescript-react-native-resolver`** - TypeScript resolver for React Native

## Dependency Alignment

The repo uses `align-deps` to maintain consistent dependency versions. Run from root:

```sh
yarn rnx-align-deps --write  # Fix misaligned dependencies
```

## Quality Checks

These all run in CI and should pass before merging:

```sh
yarn format              # Prettier formatting
yarn lint                # ESLint
yarn rnx-align-deps --write  # Dependency alignment
yarn constraints --fix   # Yarn constraints (consistent author, homepage, repository fields)
yarn knip                # Detect unused dependencies
yarn dedupe --check      # Prevent package duplicates in lockfile
node scripts/lint-tsconfig.ts  # Validate TypeScript configs
yarn update-readme       # Regenerate API docs
```

CI uses `suggestion-bot` to post code review suggestions for format, constraints, align-deps, and readme issues.

## Platform-Specific Notes

- **Test apps**: `packages/test-app` (iOS/Android), `packages/test-app-macos`, `packages/test-app-windows`
- Native builds require platform toolchains (Xcode, Android Studio, Visual Studio)
- CocoaPods installation is handled in CI via `microsoft/react-native-test-app` GitHub actions

## Code Style

- Prettier for formatting, ESLint for linting
- Run `yarn format` and `yarn lint` before committing
- Prettier config: `.github/prettierrc.json` (uses `prettier-plugin-organize-imports`)
- ESLint config: `packages/eslint-config/` (combines `@microsoft/eslint-plugin-sdl` with `@rnx-kit/eslint-plugin`)
