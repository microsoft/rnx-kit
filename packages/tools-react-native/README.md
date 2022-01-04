# @rnx-kit/tools-react-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-react-native)](https://www.npmjs.com/package/@rnx-kit/tools-react-native)

`@rnx-kit/tools-react-native` is a collection of supplemental react-native
functions and types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * from "@rnx-kit/tools-react-native";

import * from "@rnx-kit/tools-react-native/platform";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Type Name    | Description                               |
| -------- | ------------ | ----------------------------------------- |
| platform | AllPlatforms | List of supported react-native platforms. |

| Category | Function                                               | Description                                                                                     |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| platform | `expandPlatformExtensions(platform, extensions)`       | Returns a list of extensions that should be tried for the target platform in prioritized order. |
| platform | `getAvailablePlatforms(startDir)`                      | Returns a map of available React Native platforms. The result is cached.                        |
| platform | `getAvailablePlatformsUncached(startDir, platformMap)` | Returns a map of available React Native platforms. The result is NOT cached.                    |
| platform | `parsePlatform(val)`                                   | Parse a string to ensure it maps to a valid react-native platform.                              |
| platform | `platformExtensions(platform)`                         | Returns file extensions that can be mapped to the target platform.                              |

<!-- @rnx-kit/api end -->
