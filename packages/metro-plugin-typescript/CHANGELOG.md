# @rnx-kit/metro-plugin-typescript

## 0.2.0

### Minor Changes

- f01bdef6: Add a new TypeScript module resolver for React Native projects which uses the
  `moduleSuffixes` compiler option. All resolution is delegated to TypeScript,
  rather than @rnx-kit/typescript-react-native-resolver, since TypeScript's
  resolvers are more feature-rich and in sync with the node ecosystem.

### Patch Changes

- Updated dependencies [f01bdef6]
  - @rnx-kit/typescript-react-native-resolver@0.3.1

## 0.1.0

### Minor Changes

- 2f0c782e: Extract TypeScript plugin from `@rnx-kit/cli`
