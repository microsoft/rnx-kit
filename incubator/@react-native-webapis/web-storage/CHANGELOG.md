# @react-native-webapis/web-storage

## 0.2.8

### Patch Changes

- 855fa90: Bumped `androidx.core:core-ktx` to 1.13.1

## 0.2.7

### Patch Changes

- 386ddce: Workaround for autolinking not including macOS or Windows as target
  platforms (see https://github.com/react-native-community/cli/issues/2419)

## 0.2.6

### Patch Changes

- 0465cca: Fix missing `react-native-macos` and `-windows` under peer
  dependencies

## 0.2.5

### Patch Changes

- 3c55156: Add TurboModule support on Windows

## 0.2.4

### Patch Changes

- 341a40d: `NSPrivacyCollectedDataTypes` needs to be present even if we don't
  collect any data
- b6610b5: Fixed build errors when targeting canary builds of
  `react-native-windows`

## 0.2.3

### Patch Changes

- f7e6b9e: Added privacy manifest as required by Apple for app submissions

## 0.2.2

### Patch Changes

- 22420d7: Migrate away from
  `com.facebook.react.turbomodule.core.interfaces.TurboModule` as it has been
  moved/renamed in 0.74 and will break TurboModule detection

## 0.2.1

### Patch Changes

- 71f526a: Ignore nullability warnings in generated specs

## 0.2.0

### Minor Changes

- b77e3eb: Fix old arch code being included when new arch is enabled. Also had
  to bump `react-native` requirement because changes in `@react-native/codegen`
  0.72 are not backwards-compatible with 0.71.

## 0.1.3

### Patch Changes

- f079264: Include `.ts` files needed by codegen

## 0.1.2

### Patch Changes

- 0119e74: Add support for New Architecture

## 0.1.1

### Patch Changes

- abd399c: Fixed missing `lib` folder

## 0.1.0

### Minor Changes

- 93e8be95: Web Storage API for React Native
