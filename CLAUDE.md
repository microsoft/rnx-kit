# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`rnx-kit` is a collection of React Native developer tools created by Microsoft. It provides dependency management, Metro bundling enhancements, native build tools, and platform-specific utilities to streamline the React Native development workflow at scale.

## Repository Structure

This is a Yarn workspaces monorepo with two main areas:

```
/packages/        - Stable, published packages
/incubator/       - Experimental packages under development
/scripts/         - Internal build tooling (rnx-kit-scripts)
```

### Key Package Categories

- **Dependency Management**: `align-deps`, `config`, `dep-check`
- **Metro Tooling**: `metro-config`, `metro-serializer`, `metro-serializer-esbuild`, `metro-plugin-*`
- **Build Tools**: `cli`, `babel-preset-metro-react-native`, `bundle-diff`
- **Platform Utilities**: `tools-*` packages (e.g., `tools-android`, `tools-apple`, `tools-node`)
- **Testing**: `test-app`, `test-app-windows`, `test-app-macos`, `jest-preset`
- **Native Modules**: `react-native-host`, `react-native-auth`, `react-native-lazy-index`

## Build System

The project uses **Nx** for task orchestration with Yarn 4 (Berry) as the package manager.

### Common Commands

#### Repository Level (run from root)
```bash
yarn                    # Install dependencies
yarn build              # Build all packages
yarn build:ci           # Build and test affected packages
yarn build-scope <pkg>  # Build specific package with dependencies
yarn test               # Run all tests
yarn lint               # Lint all packages
yarn format             # Format all packages with Prettier
yarn bundle             # Bundle all packages
yarn clean              # Clean all build artifacts (git clean)
yarn clear-cache        # Clear Nx cache
```

#### Package Level (run from package directory)
```bash
yarn build                  # Build current package only
yarn build --dependencies   # Build current package and its dependencies
yarn test                   # Run tests for current package
yarn lint                   # Lint current package
yarn format                 # Format current package
```

### Package Scripts

Most packages use `rnx-kit-scripts` (located in `/scripts/`) which provides:
- `rnx-kit-scripts build` - TypeScript compilation
- `rnx-kit-scripts test` - Jest test runner
- `rnx-kit-scripts lint` - ESLint
- `rnx-kit-scripts format` - Prettier formatting
- `rnx-kit-scripts bundle` - esbuild bundling (for CLI tools)

### Understanding Nx Behavior

- **Target Dependencies**: Defined in `nx.json`, the `build` target automatically runs `clean` and `lint` before building
- **Caching**: Nx caches build outputs. Use `nx clear-cache` if you encounter stale builds
- **Affected Commands**: `nx affected` only runs tasks on packages affected by changes since the base branch

## Development Workflow

### Creating a New Package

```bash
yarn new-package <package-name>              # Create in /packages/
yarn new-package <package-name> --experimental  # Create in /incubator/
```

This scaffolds a new package from `/packages/template/` with the correct structure:
- `src/` - TypeScript source files
- `test/` - Jest tests
- `lib/` - Compiled output (gitignored)
- `package.json` - Uses `rnx-kit-scripts` for build tasks
- `tsconfig.json` - Extends `@rnx-kit/tsconfig`
- `eslint.config.js` - Uses `@rnx-kit/eslint-config`

### Making Changes

1. Make your changes to source files in `src/`
2. Run `yarn build` (at package or repo level) to compile TypeScript
3. Run `yarn test` to verify tests pass
4. Run `yarn lint` to check for linting issues
5. Run `yarn change` to create a changeset describing your changes

### Change Management

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelogs:

```bash
yarn change             # Create a changeset (required for each PR)
yarn change:check       # Verify changeset status
```

When prompted:
- Select which packages are affected
- Choose the bump type (major/minor/patch)
- Write a user-facing description of the change

**Important**: Only one changeset is needed per feature/fix, even across multiple commits.

### Dependency Management

#### align-deps

The `@rnx-kit/align-deps` tool manages React Native dependency compatibility across the monorepo:

```bash
yarn rnx-align-deps        # Check dependencies
yarn rnx-align-deps --write  # Auto-fix dependencies
```

Package manifests can include an `rnx-kit` configuration specifying required React Native versions and capabilities. The tool ensures compatible dependency versions based on curated presets.

#### Catalog Dependencies

Some dependencies use Yarn's catalog feature (defined in `.yarnrc.yml`):
- `eslint: catalog:` → resolves to version in catalog
- `typescript: catalog:` → shared TypeScript version
- `prettier: catalog:` → shared Prettier version

This ensures consistent tooling versions across the monorepo.

### Running Tests

```bash
# Run all tests
yarn test

# Run tests for a specific package
cd packages/<package-name>
yarn test

# Run tests in watch mode (if package has jest.config.js)
cd packages/<package-name>
yarn jest --watch
```

Most packages use `@rnx-kit/jest-preset` for Jest configuration.

## Architecture Notes

### Tools Packages

The `tools-*` packages provide low-level utilities used by other packages:
- `tools-node` - Node.js utilities (package resolution, path handling)
- `tools-packages` - npm package utilities
- `tools-workspaces` - Workspace detection and management
- `tools-react-native` - React Native context and Metro integration
- `tools-manifest` - Package manifest parsing
- Platform-specific: `tools-android`, `tools-apple`, `tools-windows`

These are foundational packages that many other tools depend on.

### Metro Plugins

Metro plugins follow Metro's plugin API and integrate into the Metro bundler pipeline:
- `metro-plugin-typescript` - TypeScript validation during bundling
- `metro-plugin-duplicates-checker` - Detect duplicate dependencies
- `metro-plugin-cyclic-dependencies-detector` - Find circular dependencies

### Serializers

Metro serializers transform bundler output:
- `metro-serializer` - Base serializer with enhanced features
- `metro-serializer-esbuild` - Uses esbuild for minification and tree-shaking

## CI/CD

The repository uses GitHub Actions for CI:
- **Build**: Runs on all PRs, executes `yarn build:ci` (affected packages)
- **Renovate**: Automated dependency updates run weekly
- **Profile Updates**: Automatically creates `align-deps` profiles for new React Native releases

## Platform-Specific Development

### Android
- Requires Android SDK Platform 34 and Build-Tools 33.0.1
- Native code in packages may have `android/` directories with Gradle builds

### iOS/macOS
- May include `.podspec` files for CocoaPods integration
- Some packages have native Swift/Objective-C code in `ios/` or `macos/` directories

### Windows
- Requires Developer Mode enabled
- Some packages target Windows-specific React Native features

## Important Notes

- **Nx Cache**: If builds behave unexpectedly, try `yarn clear-cache`
- **Node Version**: Requires Node.js >=18.12
- **Yarn Version**: Uses Yarn 4.10.3 (Berry), committed in `.yarn/releases/`
- **No Hoisting**: Uses `pnpm` node linker (configured in `.yarnrc.yml`)
- **Build Dependencies**: The `build` target in `nx.json` automatically runs `clean` and `lint` first
- **Changesets Required**: All PRs must include a changeset unless the change is documentation-only
- **Experimental Packages**: Packages in `/incubator/` are not yet stable

## Useful Links

- Documentation: https://microsoft.github.io/rnx-kit/
- Dependency Dashboard: https://github.com/microsoft/rnx-kit/issues/1680
- align-deps Design: https://microsoft.github.io/rnx-kit/docs/architecture/dependency-management
