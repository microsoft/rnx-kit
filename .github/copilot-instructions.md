# GitHub Copilot Instructions for rnx-kit

## Project Overview

`rnx-kit` is a collection of battle-tested React Native development tools
created by Microsoft engineers. This is a **monorepo** using:

- **Nx** for build orchestration and project management
- **Yarn v4** as the package manager with workspaces
- **TypeScript** as the primary language
- **Node.js ≥18.12** runtime requirement

## Repository Structure

```
packages/        # Main published packages
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
├── package.json          # Standard npm package manifest
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

- `build`: Compile TypeScript
- `format`: Run Prettier
- `lint`: Run ESLint
- `test`: Run Jest tests
- `bundle`: Bundle for distribution (where applicable)

### Nx Integration

- Use `nx run-many --target <target>` for bulk operations
- Dependencies between packages are automatically detected
- Build cache is enabled for performance
- Use `nx affected` for incremental builds in CI

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
- Avoid duplicate dependencies (checked by `align-deps`)

### Common Dependencies

- `@rnx-kit/console` for logging utilities
- `@rnx-kit/tools-*` for platform-specific utilities
- React Native community packages where applicable

## Testing Patterns

### Jest Configuration

- All packages use `@rnx-kit/jest-preset`
- Tests in `/test/` directory alongside source
- Use `.test.ts` suffix for test files
- Mock external dependencies appropriately

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

### Publishing

- Uses Changesets for version management and publishing
- Automated releases via GitHub Actions
- Change logs generated from changeset descriptions

### Performance

- Nx caching for build performance
- Incremental builds using `nx affected`
- Tree-shakable exports where possible

## Platform-Specific Notes

### React Native

- Support multiple RN versions where possible
- Handle platform differences (iOS, Android, Windows, macOS)
- Use React Native community standards

### Metro Integration

- Follow Metro plugin architecture
- Handle both development and production builds
- Respect Metro's transformer and serializer APIs

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
