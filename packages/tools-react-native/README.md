# @rnx-kit/tools-react-native

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/tools-react-native)](https://www.npmjs.com/package/@rnx-kit/tools-react-native)

`@rnx-kit/tools-react-native` is a collection of supplemental react-native
functions and types.

You can import the entire package, or, to save space, import individual
categories:

```typescript
import * as tools from "@rnx-kit/tools-react-native";

// Alternatively...
import * as metroTools from "@rnx-kit/tools-react-native/metro";
import * as platformTools from "@rnx-kit/tools-react-native/platform";
```

<!-- The following table can be updated by running `yarn update-readme` -->
<!-- @rnx-kit/api start -->

| Category | Type Name    | Description                               |
| -------- | ------------ | ----------------------------------------- |
| platform | AllPlatforms | List of supported react-native platforms. |

| Category | Function                                               | Description                                                                                                                                                                                            |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| context  | `loadContext(projectRoot)`                             | Equivalent to calling `loadConfig()` from `@react-native-community/cli`, but the result is cached for faster subsequent accesses.                                                                      |
| context  | `loadContextAsync(projectRoot)`                        | Equivalent to calling `loadConfigAsync()` (with fallback to `loadConfig()`) from `@react-native-community/cli`, but the result is cached for faster subsequent accesses.                               |
| context  | `resolveCommunityCLI(root, reactNativePath)`           | Finds path to `@react-native-community/cli`.                                                                                                                                                           |
| metro    | `findMetroPath(projectRoot)`                           | Finds the installation path of Metro.                                                                                                                                                                  |
| metro    | `getMetroVersion(projectRoot)`                         | Returns Metro version number.                                                                                                                                                                          |
| metro    | `requireModuleFromMetro(moduleName, fromDir)`          | Imports specified module starting from the installation directory of the currently used `metro` version.                                                                                               |
| platform | `expandPlatformExtensions(platform, extensions)`       | Returns a list of extensions that should be tried for the target platform in prioritized order.                                                                                                        |
| platform | `getAvailablePlatforms(startDir)`                      | Returns a map of available React Native platforms. The result is cached.                                                                                                                               |
| platform | `getAvailablePlatformsUncached(startDir, platformMap)` | Returns a map of available React Native platforms. The result is NOT cached.                                                                                                                           |
| platform | `getModuleSuffixes(platform, appendEmpty)`             | Get the module suffixes array for a given platform, suitable for use with TypeScript's moduleSuffixes setting in the form of ['.ios', '.native', ''] or ['.windows', '.win', '.native', ''] or similar |
| platform | `parsePlatform(val)`                                   | Parse a string to ensure it maps to a valid react-native platform.                                                                                                                                     |
| platform | `platformExtensions(platform)`                         | Returns file extensions that can be mapped to the target platform.                                                                                                                                     |
| platform | `platformValues()`                                     |                                                                                                                                                                                                        |
| platform | `tryParsePlatform(val)`                                |                                                                                                                                                                                                        |

<!-- @rnx-kit/api end -->
