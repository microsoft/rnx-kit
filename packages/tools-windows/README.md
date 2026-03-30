# @rnx-kit/tools-windows

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-windows)](https://www.npmjs.com/package/@rnx-kit/tools-windows)

`@rnx-kit/tools-windows` is a collection of functions for deploying apps on
Windows.

Usage:

```typescript
import * as tools from "@rnx-kit/tools-windows";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Function                     | Description                                                             |
| -------- | ---------------------------- | ----------------------------------------------------------------------- |
| -        | `getPackageInfo(app)`        | Returns information about the app package at specified path.            |
| -        | `install(app, tryUninstall)` | Installs the app package at specified path, and returns its identifier. |
| -        | `start(packageId)`           | Starts the app with specified identifier.                               |

<!-- @rnx-kit/api end -->
