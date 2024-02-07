# Change Log - @rnx-kit/react-native-test-app-msal

## 2.1.8

### Patch Changes

- c1c0f7a: Fix build issues with React Native 0.73
- Updated dependencies [c1c0f7a]
  - @rnx-kit/react-native-auth@0.2.6

## 2.1.7

### Patch Changes

- fe7db24e: Update dependency `com.microsoft.identity.client:msal` to v4.7.0

## 2.1.6

### Patch Changes

- 24ffac89: Bump `com.microsoft.identity.client:msal` to v4.6.3

## 2.1.5

### Patch Changes

- 4079b5bc: Implement `initWithHost:` introduced in `react-native-test-app` 2.5.11

## 2.1.4

### Patch Changes

- 3c97f6f9: Bump `com.microsoft.identity.client:msal` to v4.6.1
- 525a764e: Use `androidx.activity:activity-ktx` 1.7.2 if Kotlin version is 1.8 or greater

## 2.1.3

### Patch Changes

- 5df3bb78: Update dependency `com.microsoft.identity.client:msal` to v4.5.0

## 2.1.2

### Patch Changes

- f41f538c: Update dependency com.google.android.material:material to v1.8.0
- f18acaca: Fix the "Kotlin Gradle plugin was loaded multiple times" warning
- Updated dependencies [f18acaca]
  - @rnx-kit/react-native-auth@0.2.2

## 2.1.1

### Patch Changes

- bffb1769: Bump `com.microsoft.identity.client:msal` to v4.2.0

## 2.1.0

### Minor Changes

- 6dac8ed5: Add flag to support optional auth module registration

## 2.0.2

### Patch Changes

- 1b080e9b: Bump dependencies:

  - `androidx.activity:activity-ktx` 1.5.1 -> 1.6.1
  - `com.google.android.material:material` 1.6.1 -> 1.7.0
  - `com.microsoft.identity.client:msal` 4.0.4 -> 4.1.3

## 2.0.1

### Patch Changes

- 234c51e2: Bump `com.microsoft.identity.client:msal` to v4.0.4

## 2.0.0

### Major Changes

- afd170e6: Add acquireTokenWithResource to Auth API, rename acquireToken to acquireTokenWithScopes

### Patch Changes

- Updated dependencies [afd170e6]
  - @rnx-kit/react-native-auth@0.2.0

## 1.0.5

### Patch Changes

- 4c462bf3: Android: Bump com.microsoft.identity.client:msal to 4.0.1

## 1.0.4

### Patch Changes

- 203f327c: Depend on an explicit version of Kotlin Android plugin using the [plugins DSL](https://docs.gradle.org/current/userguide/plugins.html#sec:plugins_block)
- Updated dependencies [203f327c]
  - @rnx-kit/react-native-auth@0.1.4

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
