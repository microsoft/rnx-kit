# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`rnx-kit` is a monorepo of React Native tooling created by Microsoft. It provides battle-tested tools for dependency management, Metro bundling enhancements, TypeScript integration, and cross-platform development (iOS, Android, macOS, Windows).

## Repository Structure

- **`packages/`** - Stable, published packages (e.g., `@rnx-kit/cli`, `@rnx-kit/align-deps`, `@rnx-kit/metro-*`)
- **`incubator/`** - Experimental packages (marked with `"experimental": true` in package.json)
- **`scripts/`** - Internal build tooling (`rnx-kit-scripts` CLI)
- **`docsite/`** - Documentation website (separate Yarn workspace)

## Build System

Uses **Nx** for task orchestration with **Yarn Berry** workspaces.

### Key Commands (Repository Root)

```sh
yarn                     # Install dependencies
yarn build               # Build all packages
yarn build-scope <pkg>   # Build specific package with dependencies (e.g., yarn build-scope @rnx-kit/cli)
yarn test                # Build and test all packages
yarn lint                # Lint all packages
yarn format              # Format all packages with Prettier
yarn clean               # Clean build artifacts (git clean)
```

### Package-Level Commands

```sh
yarn build               # Build current package only
yarn build --dependencies # Build current package and its dependencies
yarn test                # Run tests (Jest or Node test runner)
yarn lint                # Lint current package
yarn format              # Format current package
```

### Running Tests

- Most packages use Jest with `@rnx-kit/jest-preset`
- Run specific test: `yarn test path/to/file.test.ts` (from package directory)
- Tests are in `test/` directories with `.test.ts` extension

### CI Commands

```sh
yarn build:ci            # Build affected packages
yarn bundle:ci           # Bundle affected packages
yarn change:check        # Verify change files exist for modified packages
```

## Package Conventions

- Each package uses `rnx-kit-scripts` for build/test/lint commands
- TypeScript source in `src/`, compiled output in `lib/`
- Standard dev dependencies: `@rnx-kit/eslint-config`, `@rnx-kit/jest-preset`, `@rnx-kit/scripts`, `@rnx-kit/tsconfig`
- Entry point typically at `src/index.ts`

## Creating New Packages

```sh
yarn new-package <name>              # Creates in packages/
yarn new-package <name> --experimental # Creates in incubator/
```

Uses `packages/template` as baseline.

## Change Management

Uses [Changesets](https://github.com/atlassian/changesets) for versioning:

```sh
yarn change              # Create change file for PR
```

One change file per feature/fix; no need for multiple entries when addressing PR feedback.

## Key Packages

- **`@rnx-kit/cli`** - Main CLI (`rnx-cli`) integrating all tools
- **`@rnx-kit/align-deps`** - Dependency version alignment across repos
- **`@rnx-kit/metro-*`** - Metro bundler plugins (TypeScript, tree-shaking, duplicate detection)
- **`@rnx-kit/tools-*`** - Platform-specific utilities (android, apple, node, react-native)
- **`@rnx-kit/config`** - Configuration loading from `package.json` `rnx-kit` field

## Dependency Alignment

The repo uses `align-deps` to maintain consistent dependency versions. Run from root:

```sh
yarn rnx-align-deps --write  # Fix misaligned dependencies
```

## Platform-Specific Notes

- **Test apps**: `packages/test-app` (iOS/Android), `packages/test-app-macos`, `packages/test-app-windows`
- Native builds require platform toolchains (Xcode, Android Studio, Visual Studio)
- Pod installation: `yarn install-pods` from test-app directories

## Code Style

- Prettier for formatting, ESLint for linting
- Run `yarn format` and `yarn lint` before committing
- Configuration in `.github/prettierrc.json` and `packages/eslint-config/`
