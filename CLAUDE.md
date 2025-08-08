# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`rnx-kit` is a collection of battle-tested React Native development tools created by Microsoft engineers. This is a **monorepo** containing tools for dependency management, bundling, native builds, and development workflow optimization across React Native projects at scale.

## Repository Architecture

### High-Level Structure
```
packages/        # Main published packages (@rnx-kit/* scope)
incubator/       # Experimental/beta packages  
scripts/         # Build and maintenance scripts
docsite/         # Docusaurus documentation site
```

### Key Package Categories
- **Dependency Management**: `align-deps`, `dep-check`
- **Metro Bundling**: `metro-config`, `metro-serializer*`, `metro-plugin-*`
- **Build Tools**: `cli`, `build` (incubator), native platform tools
- **Development Tools**: `eslint-config`, `jest-preset`, `babel-preset-*`
- **React Native Utilities**: `react-native-*`, `tools-*`

### Architecture Patterns
- **Nx Monorepo**: Uses Nx for build orchestration with project dependencies
- **Workspace Dependencies**: Internal packages use `workspace:*` references
- **Common Build Scripts**: All packages use `@rnx-kit/scripts` for consistent commands
- **Platform-Specific Tools**: Separate `tools-*` packages for iOS, Android, Windows, etc.

## Build System & Commands

### Primary Commands (Root Level)
```bash
yarn build         # Build all packages using Nx
yarn test          # Build and test all packages  
yarn lint          # Lint all packages
yarn bundle        # Bundle packages for distribution
yarn format        # Format code with Prettier
yarn clean         # Clean build artifacts (git clean -dfqx)
```

### Development Commands
```bash
yarn new-package <name>     # Create new package from template
yarn change                 # Create Changeset entry for versioning
yarn change:check           # Check changeset status
yarn rnx-align-deps         # Align dependencies across workspace
yarn show-affected          # Show Nx affected projects
```

### Package-Level Commands
Each package supports standard scripts via `@rnx-kit/scripts`:
- `yarn build` - TypeScript compilation to `lib/`
- `yarn lint` - ESLint with `@rnx-kit/eslint-config`
- `yarn test` - Jest tests with `@rnx-kit/jest-preset`
- `yarn format` - Prettier formatting
- `bundle` - Bundle for distribution (where applicable)

### Nx Integration Details
- **Build Dependencies**: Packages automatically depend on upstream builds
- **Affected Builds**: Use `nx affected --targets build,test` for incremental CI
- **Caching**: Build and test results are cached for performance
- **Target Defaults**: Defined in `nx.json` with dependency ordering

## Development Workflow

### Package Structure Standards
Every package follows this structure:
```
package-name/
├── package.json          # @rnx-kit/package-name scope
├── eslint.config.js      # Points to @rnx-kit/eslint-config  
├── tsconfig.json         # TypeScript configuration
├── src/                  # Source code
│   └── index.ts         # Main entry point
├── lib/                 # Compiled output (gitignored)
└── test/                # Jest tests
    └── *.test.ts
```

### Code Style & Standards
- **Prettier** formatting with shared config at `.github/prettierrc.json`
- **ESLint** with `@rnx-kit/eslint-config` (applied to all packages)
- **TypeScript** strict configuration
- Single quotes, 2-space indentation, trailing whitespace trimmed

### Testing Strategy
- **Jest Preset**: All packages use `@rnx-kit/jest-preset`
- **Test Location**: Tests in `/test/` directory with `.test.ts` suffix
- **Coverage**: Test coverage tracked per package

### Versioning & Publishing
- **Changesets**: Use `yarn change` to create changeset entries
- **Automated Publishing**: GitHub Actions handle releases
- **Semantic Versioning**: Follows semver with automated changelog generation

## Key Dependencies & Tooling

### Core Technologies
- **Nx**: ^20.3.3 (patched) - Build orchestration and monorepo management
- **Yarn v4**: Package manager with workspaces
- **TypeScript**: ^5.0.0 - Primary language across all packages
- **Node.js**: >=18.12 runtime requirement

### Development Dependencies
- **ESLint**: ^9.0.0 with custom `@rnx-kit/eslint-config`
- **Prettier**: ^3.0.0 with `prettier-plugin-organize-imports`
- **Jest**: ^29.2.1 with `@rnx-kit/jest-preset`
- **Changesets**: ^2.22.0 for version management

### React Native Integration
- Multiple React Native version support patterns
- Platform-specific handling (iOS, Android, Windows, macOS)
- Metro bundler integration and plugin architecture
- Native module configuration for platforms

## Important Notes

### Package Management
- Use `yarn new-package <name>` to create new packages from template
- Internal dependencies must use `workspace:*` syntax
- Dependencies are aligned across workspace using `align-deps` tool
- Package names use `@rnx-kit/` scope with kebab-case

### Build Considerations
- Nx handles build order based on package dependencies
- TypeScript builds output to `lib/` directory with source maps
- Type definitions (`.d.ts`) included in published packages
- Build cache significantly improves performance

### Development Environment
- Node.js ≥18.12 required
- Yarn v4.6.0 specified as package manager
- Git hooks may be configured for pre-commit validation
- All packages are private except published ones

### Metro & React Native
- Metro plugins follow established plugin architecture patterns
- Support for multiple React Native versions across packages
- Platform-specific configurations handled per tool
- Native module integration for iOS/Android/Windows/macOS

### CI/CD Integration
- Nx affected commands optimize CI build times
- Changeset-based automated publishing workflow
- Build artifacts cached across CI runs
- Comprehensive linting and testing in CI pipeline