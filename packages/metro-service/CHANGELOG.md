# Change Log - @rnx-kit/metro-service

## 3.1.5

### Patch Changes

- 2885f73c: Ensure correct Metro dependencies are used by traversing the dependency chain starting from `react-native`
- Updated dependencies [2885f73c]
  - @rnx-kit/tools-react-native@1.3.4

## 3.1.4

### Patch Changes

- 55756581: Resolve correct `@react-native-community/cli-plugin-metro` instance through `react-native`
- Updated dependencies [55756581]
  - @rnx-kit/tools-node@2.1.0

## 3.1.3

### Patch Changes

- c9e7641b: Reuse code from `@react-native/assets-registry`
- 8ba65d6f: Use `node-fetch` only as fallback when current Node version doesn't implement Fetch API

## 3.1.2

### Patch Changes

- 39f0a3b2: Fix help message not showing on startup (and add preliminary support for 0.73)
- d9f6c50a: Ensure dependencies are correctly declared

## 3.1.1

### Patch Changes

- 11e8e546: Use `@react-native/metro-config` to determine whether we need `getDefaultConfig` to load Metro config

## 3.1.0

### Minor Changes

- 2edf436c: Refactor saveAssets code to allow out of tree overrides

### Patch Changes

- 18c757ba: Resolve npmPackageName from project root not local paths
- 513efaab: `@react-native-community/cli-plugin-metro` has been deprecated. Sync to the
  latest changes and don't depend on it for bundling.

  `@react-native-community/cli-plugin-metro` is being moved into the
  `react-native` repository. In the process, it was renamed and its API surface
  has been reduced to the bare minimum. `buildBundleWithConfig`, which we need to
  pass our custom config to the bundler, has also been axed. For more details, see
  https://github.com/facebook/react-native/pull/38795.

- 6da44cd3: Warn if `projectRoot` may be misconfigured

## 3.0.5

### Patch Changes

- 2d8fab91: Fix out-of-tree platforms not being included on react-native 0.72

## 3.0.4

### Patch Changes

- f1dfcf6b: Inline helper function for comparing floats
- Updated dependencies [f1dfcf6b]
  - @rnx-kit/tools-language@2.0.0

## 3.0.3

### Patch Changes

- 775ef91d: Fix exceptions unintentionally being caught

## 3.0.2

### Patch Changes

- d7150595: Add support for "Random Access Module" bundle format

## 3.0.1

### Patch Changes

- 2aaf2804: Replace `cp-file`, `make-dir` with Node API

## 3.0.0

### Major Changes

- 93dda3ab: Drop support for Node 10

## 2.0.1

### Patch Changes

- 641d8978: Support `@react-native-community/cli-plugin-metro` >=6.1.0

## 2.0.0

### Major Changes

- e2535866: # Breaking Changes

  This version transitions from using our own internal bundling wrapper to the
  official bundling API in `@react-native-community/cli-plugin-metro`, when it is
  available.

  Our wrapper is a little different than the official code, in that it does not
  honor the `sourcemapUseAbsolutePath` flag. So this change also adds support for
  that flag in our wrapper, making it fully compatible and interchangeable with
  the official bundling API.

  This is a breaking change because, when `sourcemapUseAbsolutePath` is `false`,
  `sourcemapOutput` is stripped of any path info, leaving only the name of the
  source-map file.

## 1.1.14

### Patch Changes

- fff5081: Use `@react-native-community/cli-plugin-metro` if installed

## 1.1.13

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.6

## 1.1.12

Thu, 18 Nov 2021 20:51:05 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.5

## 1.1.11

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.4

## 1.1.10

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.3

## 1.1.9

Wed, 03 Nov 2021 18:15:39 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.2

## 1.1.8

Mon, 01 Nov 2021 13:46:13 GMT

### Patches

- Normalize main and types fields across all packages which use them. (afoxman@microsoft.com)
- Bump @rnx-kit/tools-language to v1.2.1

## 1.1.7

Sat, 30 Oct 2021 07:50:51 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.0

## 1.1.6

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.1.4

## 1.1.5

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.1.3

## 1.1.4

Fri, 29 Oct 2021 08:51:30 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.1.2

## 1.1.3

Tue, 31 Aug 2021 06:43:13 GMT

### Patches

- Stricter handling of errors (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/metro-service to v1.1.3 (4123478+tido64@users.noreply.github.com)

## 1.1.2

Wed, 25 Aug 2021 07:32:57 GMT

### Patches

- Bump @rnx-kit/metro-service to v1.1.2 (afoxman@microsoft.com)

## 1.1.1

Sat, 21 Aug 2021 08:22:48 GMT

### Patches

- Integrate tools package and other common libraries throughout monorepo, removing custom code. (afoxman@microsoft.com)
- Bump @rnx-kit/metro-service to v1.1.1 (afoxman@microsoft.com)

## 1.1.0

Fri, 06 Aug 2021 17:50:49 GMT

### Minor changes

- Remove props that have no effect from bundle API. Update loadMetroConfig to support more overrides. Export Metro's runServer API as startServer. Export createTerminal API which instantiates a new Metro terminal and terminal reporter. (afoxman@microsoft.com)

## 1.0.6

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/metro-service to v1.0.6 (4123478+tido64@users.noreply.github.com)

## 1.0.5

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/metro-service to v1.0.5 (4123478+tido64@users.noreply.github.com)

## 1.0.4

Thu, 22 Jul 2021 16:59:25 GMT

### Patches

- Support Metro <0.63 (4123478+tido64@users.noreply.github.com)

## 1.0.3

Tue, 13 Jul 2021 17:31:45 GMT

### Patches

- Remove dependency on mkdirp, and use nodejs "fs" instead. Add a tolerance when finding a matching scale factor for android. Move "throw" statement into scale search routine, so that it always returns a real value (or throws). Add tests. (afoxman@microsoft.com)

## 1.0.2

Tue, 29 Jun 2021 06:01:48 GMT

### Patches

- Add a metro-service package for interacting with metro at an API level, rather than through its command-line interface. (afoxman@microsoft.com)

## 1.0.1

Mon, 28 Jun 2021 08:19:07 GMT

### Patches

- Add a metro-service package for interacting with metro at an API level, rather than through its command-line interface. (afoxman@microsoft.com)
