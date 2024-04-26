# @rnx-kit/tools-apple

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-apple)](https://www.npmjs.com/package/@rnx-kit/tools-apple)

`@rnx-kit/tools-apple` is a collection of functions for deploying apps on iOS or
macOS.

Usage:

```typescript
import * as tools from "@rnx-kit/tools-apple";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                                       | Description                                                                  |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| ios      | `bootSimulator(simulator)`                     | Boots the simulator with the specified UDID.                                 |
| ios      | `getAvailableSimulators(search)`               | Returns a list of available iOS simulators.                                  |
| ios      | `getDevices()`                                 | Returns a list of available iOS simulators and physical devices.             |
| ios      | `install(device, app)`                         | Installs the specified app bundle on specified simulator or physical device. |
| ios      | `launch(device, app)`                          | Launches the specified app bundle on specified simulator or physical device. |
| ios      | `selectDevice(deviceName, deviceType, logger)` | Returns the simulator or physical device with the specified name.            |
| xcode    | `getDeveloperDirectory()`                      | Returns the path to the active developer directory.                          |
| xcode    | `parsePlist(app)`                              | Parses and returns the information property list of specified bundle.        |

<!-- @rnx-kit/api end -->
