# GitHub Copilot Instructions for rnx-kit

## Project Overview

`rnx-kit` is a collection of battle-tested React Native development tools
created by Microsoft engineers for optimizing React Native development at scale.
This is a **monorepo** using:

- **Nx v20.3.3** (patched) for build orchestration and project management
- **Yarn v4.6.0** as the package manager with workspaces
- **TypeScript v5.0+** as the primary language with strict configuration
- **Node.js ≥18.12** runtime requirement

### Core Architecture

- **Nx Monorepo**: Build orchestration with automatic project dependencies
- **Workspace Dependencies**: Internal packages use `workspace:*` references
- **Common Build Scripts**: All packages use `@rnx-kit/scripts` for consistency
- **Platform-Specific Tools**: Separate `tools-*` packages for iOS, Android,
  Windows, etc.

## Repository Structure

```
packages/        # Main published packages (@rnx-kit/* scope)
incubator/       # Experimental/beta packages
scripts/         # Build and maintenance scripts
docsite/         # Docusaurus documentation site
```

### Key Packages Categories

- **Dependency Management**: `align-deps`, `dep-check`
- **Metro Bundling**: `metro-config`, `metro-serializer*`, `metro-plugin-*`
- **Build Tools**: `cli`, `build` (incubator), native platform tools
- **Development Tools**: `eslint-config`, `jest-preset`, `babel-preset-*`
- **React Native Utilities**: `react-native-*`, `tools-*`

## Build System & Development Commands

### Root-Level Commands

```bash
yarn build              # Build all packages using Nx
yarn test               # Build and test all packages
yarn lint               # Lint all packages with ESLint
yarn bundle             # Bundle packages for distribution
yarn format             # Format code with Prettier
yarn clean              # Clean build artifacts (git clean -dfqx)
yarn new-package <name> # Create new package from template
yarn change             # Create Changeset entry for versioning
yarn rnx-align-deps     # Align dependencies across workspace
yarn show-affected      # Show Nx affected projects
```

### Package-Level Commands

Each package supports these scripts via `@rnx-kit/scripts`:

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

## Development Guidelines

### Code Style & Standards

- **Prettier** for formatting with shared config at `.github/prettierrc.json`
- **ESLint** with `@rnx-kit/eslint-config` (shared across all packages)
- **TypeScript** with strict configuration
- Single quotes for JavaScript/TypeScript (`'` not `"`)
- 2-space indentation
- Trim trailing whitespace

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

### Common Scripts

All packages use `@rnx-kit/scripts` for consistent build commands:

- `build`: Compile TypeScript to `lib/` with source maps
- `format`: Run Prettier with organize imports
- `lint`: Run ESLint with `@rnx-kit/eslint-config`
- `test`: Run Jest tests with `@rnx-kit/jest-preset`
- `bundle`: Bundle for distribution (where applicable)

### Nx Integration

- Use `nx run-many --target <target>` for bulk operations
- Dependencies between packages are automatically detected
- Build cache is enabled for performance
- Use `nx affected` for incremental builds in CI
- Build order handled automatically based on package dependencies

## Filing & Naming Conventions

### Package Naming

- All packages use `@rnx-kit/` scope
- Use kebab-case: `@rnx-kit/metro-plugin-typescript`
- Tools packages: `@rnx-kit/tools-<platform>` (e.g., `tools-android`)
- Metro plugins: `@rnx-kit/metro-plugin-<feature>`
- CLI tools often have `rnx-` prefix in bin name

### File Extensions

- `.ts` for TypeScript source files
- `.js` for JavaScript config files (eslint, jest, etc.)
- `.test.ts` for Jest tests
- `.d.ts` for type definitions

### Import/Export Patterns

- Use `export` from main `src/index.ts` for public API
- Internal utilities in separate files under `src/`
- Prefer named exports over default exports
- Use barrel exports in index files

## Dependencies Management

### Workspace Dependencies

- Use `workspace:*` for internal package references
- External deps in `devDependencies` where possible
- Dependencies are aligned across workspace using `align-deps` tool
- Avoid duplicate dependencies (checked by `align-deps`)

### Common Dependencies

- `@rnx-kit/console` for logging utilities
- `@rnx-kit/tools-*` for platform-specific utilities
- React Native community packages where applicable

### Key Development Dependencies

- **ESLint**: ^9.0.0 with custom `@rnx-kit/eslint-config`
- **Prettier**: ^3.0.0 with `prettier-plugin-organize-imports`
- **Jest**: ^29.2.1 with `@rnx-kit/jest-preset`
- **Changesets**: ^2.22.0 for version management

### Testing Patterns

### Jest Configuration

- All packages use `@rnx-kit/jest-preset`
- Tests in `/test/` directory alongside source
- Use `.test.ts` suffix for test files
- Mock external dependencies appropriately
- Test coverage tracked per package

### Test Structure

```typescript
describe("FeatureName", () => {
  it("should handle expected case", () => {
    // Arrange, Act, Assert pattern
  });
});
```

## Documentation Standards

### README Structure

Each package should include:

1. Brief description and purpose
2. Installation instructions
3. Usage examples
4. Configuration options
5. API reference (auto-generated where possible)

### API Documentation

- Use TSDoc comments for public APIs
- Include `@param` and `@returns` tags
- Provide usage examples in comments

## Build & CI Considerations

### Build Process

- TypeScript compilation to `lib/` directory
- Type definitions (`.d.ts`) included in published packages
- Source maps for debugging
- Build order handled automatically by Nx based on dependencies

### Publishing

- Uses Changesets for version management and publishing
- Automated releases via GitHub Actions
- Change logs generated from changeset descriptions
- Semantic versioning with automated changelog generation

### Performance

- Nx caching for build performance
- Incremental builds using `nx affected`
- Tree-shakable exports where possible
- Build artifacts cached across CI runs

## Platform-Specific Notes

### React Native

- Support multiple RN versions where possible
- Handle platform differences (iOS, Android, Windows, macOS)
- Use React Native community standards
- Native module configuration for each platform
- Multiple React Native version support patterns

### Metro Integration

- Follow Metro plugin architecture
- Handle both development and production builds
- Respect Metro's transformer and serializer APIs
- Metro plugins follow established plugin architecture patterns

### Node.js

- Minimum Node 18.12 support
- Use modern Node.js APIs appropriately
- Handle different package managers (yarn, npm, pnpm)

## Error Handling

### Logging

- Use `@rnx-kit/console` for consistent output
- Include actionable error messages
- Use appropriate log levels (error, warn, info)

### Error Messages

- Provide clear, actionable error messages
- Include context and suggested fixes
- Link to documentation where helpful

## When Contributing

1. Run `yarn new-package <name>` for new packages
2. Use `yarn change` to create changeset entries
3. Follow the existing package patterns and structure
4. Ensure tests pass and code is properly formatted
5. Update documentation as needed

Remember: This is a Microsoft OSS project serving React Native developers at
scale. Prioritize reliability, performance, and developer experience.
