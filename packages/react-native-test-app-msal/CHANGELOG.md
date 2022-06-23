# Change Log - @rnx-kit/react-native-test-app-msal

## 1.0.3

### Patch Changes

- 01e91b07: Fixed build fail on macOS
- Updated dependencies [641edba5]
  - @rnx-kit/react-native-auth@0.1.3

## 1.0.2

### Patch Changes

- aec1f838: Fix git tag format in podspec
- Updated dependencies [aec1f838]
  - @rnx-kit/react-native-auth@0.1.2

## 1.0.1

### Patch Changes

- 8c62b6a: Fixed `msal_config.json` being generated before the `:app:clean` task is run, causing MSAL to throw an exception on initialisation because of the missing configuration file.
- 521505c: Throw if `msal_config.json` is missing, otherwise Android will throw a cryptic/generic exception that's hard to debug.

## 1.0.0

### Patch Changes

- 6507cb5: Adds support for @rnx-kit/react-native-auth module
- Updated dependencies [6507cb5]
  - @rnx-kit/react-native-auth@0.1.0

## 0.3.0

### Minor Changes

- 1c5e36d: Added support for Android

## 0.2.0

Mon, 22 Nov 2021 12:15:07 GMT

### Minor changes

- Refactored auth callback to make it simpler to add properties to the result. (4123478+tido64@users.noreply.github.com)

## 0.1.0

Wed, 03 Nov 2021 18:15:39 GMT

### Minor changes

- MSAL module for react-native-test-app (4123478+tido64@users.noreply.github.com)
