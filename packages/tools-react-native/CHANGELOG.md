# Change Log - @rnx-kit/tools-react-native

## 1.3.5

### Patch Changes

- afe49c6: Allow importing `metro-source-map` via `metro`

## 1.3.4

### Patch Changes

- 2885f73c: Ensure correct Metro dependencies are used by traversing the dependency chain starting from `react-native`

## 1.3.3

### Patch Changes

- bc2b2627: Allow bundling directly from TypeScript source
- Updated dependencies [bc2b2627]
  - @rnx-kit/tools-node@2.0.1

## 1.3.2

### Patch Changes

- 1bc772cc: Find `metro` via the new `@react-native/community-cli-plugin` package

## 1.3.1

### Patch Changes

- Updated dependencies [f1dfcf6b]
  - @rnx-kit/tools-node@2.0.0

## 1.3.0

### Minor Changes

- 75b98095: Added functions for finding the installation path of Metro, and for retrieving its version

## 1.2.3

### Patch Changes

- 53df63dd: `extensions` argument of `expandPlatformExtensions` should be readonly

## 1.2.2

### Patch Changes

- 2fc666f: Ignore errors in `react-native.config.js`

## 1.2.1

### Patch Changes

- 3232fdd: Fix `ERR_PACKAGE_PATH_NOT_EXPORTED` when importing packages using the `exports` field

## 1.2.0

### Minor Changes

- adf6feb: Added a function to get available React Native platforms

## 1.1.0

### Minor Changes

- 1a2cf67: Added functions for retrieving platform extensions

## 1.0.5

Mon, 01 Nov 2021 13:46:13 GMT

### Patches

- Normalize main and types fields across all packages which use them. (afoxman@microsoft.com)

## 1.0.1

Sat, 21 Aug 2021 08:22:48 GMT

### Patches

- Create a react-native tools package (afoxman@microsoft.com)
