# @rnx-kit/tools-android

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-android)](https://www.npmjs.com/package/@rnx-kit/tools-android)

`@rnx-kit/tools-android` is a collection of functions for deploying apps on
Android.

Usage:

```typescript
import * as tools from "@rnx-kit/tools-android";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                                    | Description                                                                      |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| -        | `getBuildToolsPath()`                       | Returns the path to Android SDK Build-Tools.                                     |
| -        | `getDevices()`                              | Returns a list of attached physical Android devices.                             |
| -        | `getEmulators()`                            | Returns a list of available Android virtual devices.                             |
| -        | `getPackageName(apk)`                       | Returns the package name and the first launchable activity of the specified APK. |
| -        | `install(device, apk, packageName)`         | Installs the specified APK on specified emulator or physical device.             |
| -        | `launchEmulator(emulatorName)`              | Launches the emulator with the specified name.                                   |
| -        | `selectDevice(emulatorName, logger)`        | Returns the emulator or physical device with the specified name.                 |
| -        | `start(options, packageName, activityName)` | Starts the specified activity on specified emulator or physical device.          |

<!-- @rnx-kit/api end -->
