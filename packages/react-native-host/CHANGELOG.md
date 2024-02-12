# @rnx-kit/react-native-host

## 0.4.3

### Patch Changes

- e02e503: Enable `concurrentRoot` by default when New Architecture is enabled.

  Having `concurrentRoot` disabled when Fabric is enabled is not
  recommended:
  https://github.com/facebook/react-native/commit/7eaabfb174b14a30c30c7017195e8110348e5f44

  As of 0.74, it won't be possible to opt-out:
  https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03

## 0.4.2

### Patch Changes

- 20864b4: Added support for Bridgeless Mode

  Bridgeless mode can now be enabled by setting the environment variable
  `USE_BRIDGELESS=1`. This build flag will enable bridgeless bits, but you can
  still disable it at runtime by implementing `RNXHostConfig.isBridgelessEnabled`.

  See the full announcement here:
  https://reactnative.dev/blog/2023/12/06/0.73-debugging-improvements-stable-symlinks#new-architecture-updates

## 0.4.1

### Patch Changes

- c856f87: Add visionOS support

## 0.4.0

### Minor Changes

- 7215f80: Merged `USE_TURBOMODULE` with `USE_FABRIC`. If your config plugins were previously using `USE_TURBOMODULE`, please switch to `USE_FABRIC`.

## 0.3.2

### Patch Changes

- 476ebe8: Handle refactorings in 0.74

## 0.3.1

### Patch Changes

- 91a9ffe5: Fix New Arch not building because `folly::coro` was unintentionally enabled

## 0.3.0

### Minor Changes

- f727aa58: Bump C++ language standard to C++20

  This will unfortunately break `react-native` versions 0.65 and below, but is
  neccessary to support 0.74 and above.

## 0.2.9

### Patch Changes

- b73c47b0: Add support for 0.73

## 0.2.8

### Patch Changes

- 504a691b: Remove unused bridge events. `RCTBridge` may go away in the future and should not be exposed to users.
- 537d6f74: Describe react-native-host API in README

## 0.2.7

### Patch Changes

- 79615c96: RuntimeScheduler is only used by TurboModule Manager in >RN0.72

## 0.2.6

### Patch Changes

- 32c5ee3e: Make headers from `ReactCommon/turbomodule/core` available to config plugins

## 0.2.5

### Patch Changes

- 405dcfea: Fix 0.72 + New Architecture not being able to find `RCTAppSetupUtils.h`

## 0.2.4

### Patch Changes

- 8d8fc112: Fixed Xcode not being able to find a number of headers when targeting react-native 0.64

## 0.2.3

### Patch Changes

- 24e0eb61: Removed unused dependencies

## 0.2.2

### Patch Changes

- b4f682a1: `React-cxxreact` is only needed when New Arch is enabled

## 0.2.1

### Patch Changes

- 2ffd5f96: Fixed empty package

## 0.2.0

### Minor Changes

- b6edbc1f: Add support for New Architecture
- a402fd33: Add ability to release the bridge if it is unused when the app is backgrounded
- a402fd33: Add bridge lifecycle event callbacks

## 0.1.0

### Minor Changes

- 848548f1: `@rnx-kit/react-native-host` simplifies React Native initialization
