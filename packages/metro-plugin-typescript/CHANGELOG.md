# @rnx-kit/metro-plugin-typescript

## 0.4.4

### Patch Changes

- 1c2725b8: Implemented replacements for `resolveModuleNames` and `resolveTypeReferenceDirectives` deprecated in TypeScript 5.0 (https://github.com/microsoft/TypeScript/commit/9e845d224859950fb263dec43f8fa1f7334e52da)
- Updated dependencies [1bc772cc]
- Updated dependencies [1c2725b8]
  - @rnx-kit/tools-react-native@1.3.2
  - @rnx-kit/typescript-service@1.5.7

## 0.4.3

### Patch Changes

- a4c18204: Respect `moduleSuffixes` set at the root level

## 0.4.2

### Patch Changes

- 40a9b023: Replace `lodash`
- Updated dependencies [40a9b023]
  - @rnx-kit/config@0.6.3

## 0.4.1

### Patch Changes

- Updated dependencies [f1dfcf6b]
- Updated dependencies [f1dfcf6b]
  - @rnx-kit/typescript-service@1.5.6
  - @rnx-kit/tools-node@2.0.0
  - @rnx-kit/config@0.6.2
  - @rnx-kit/tools-react-native@1.3.1

## 0.4.0

### Minor Changes

- 3e699d3a: Deprecated TypeScript 4.6 – this plugin now requires 4.7+

### Patch Changes

- bd96118a: Fix TypeScript version being set too high
- Updated dependencies [bd96118a]
  - @rnx-kit/typescript-service@1.5.5

## 0.3.4

### Patch Changes

- 42e47987: Don't apply module suffixes when resolving main fields

## 0.3.3

### Patch Changes

- 75b98095: Disable the plugin if the current Metro version is unsupported
- Updated dependencies [75b98095]
  - @rnx-kit/tools-react-native@1.3.0

## 0.3.2

### Patch Changes

- 6a63f437: Fix failure to typecheck when running on Windows

## 0.3.1

### Patch Changes

- 95a35126: Lower Node version requirement to support any 14 LTS
- Updated dependencies [15baa5d5]
  - @rnx-kit/config@0.6.1

## 0.3.0

### Minor Changes

- d8d0cf37: Support new `plugins` option in CLI

### Patch Changes

- Updated dependencies [d8d0cf37]
  - @rnx-kit/config@0.6.0

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
