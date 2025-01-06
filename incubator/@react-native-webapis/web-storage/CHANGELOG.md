# @react-native-webapis/web-storage

## 0.4.2

### Patch Changes

- f0469e3: Make sure `key()` returns `null` if the index does not exist

## 0.4.1

### Patch Changes

- c88c843: Migrate away from deprecated `ReactModuleInfo` constructor

## 0.4.0

### Minor Changes

- dd56196: Migrate away from deprecated `TurboReactPackage`. This is a
  requirement for supporting 0.77 and above.

## 0.3.1

### Patch Changes

- 3774756: Reapply workaround for autolinking not including macOS or Windows as
  target platforms (see
  https://github.com/react-native-community/cli/issues/2419).

  Regressed in 70f5fdd7.

## 0.3.0

### Minor Changes

- 3afb5fa: Bump minimum Node version to 16.17

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
