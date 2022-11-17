# Change Log - @rnx-kit/metro-serializer-esbuild

## 0.1.17

### Patch Changes

- a1fcd9eb: Fix modules not being resolved in pnpm-like setups

## 0.1.16

### Patch Changes

- 8147a812: Use esbuild only for production bundles

## 0.1.15

### Patch Changes

- 23c49af7: Resolve all files in a namespace. We don't resolve files from disk, and it is required for certain functionalities such as app bundle preludes.

## 0.1.14

### Patch Changes

- f80cff5a: Use `esbuild` transform profile when `metro-serializer-esbuild` is used
- 42b6b6a5: Stop removing `"use strict";` by default as it breaks source maps
- 74fa8fe2: Add support for Metro 0.72

## 0.1.13

### Patch Changes

- 61151646: Fix source maps not pointing to source

## 0.1.12

### Patch Changes

- a05a1773: Fix missing `sourceMappingURL` comment

## 0.1.11

### Patch Changes

- aeb1e5b5: Enable arrow functions and generators when targeting Hermes

## 0.1.10

### Patch Changes

- 8c325887: Default to the new `hermes` target (retry)

## 0.1.9

### Patch Changes

- 80333120: Reverted "Default to the new `hermes` target"
- 80333120: Fixed not being able to bundle react-native

## 0.1.8

### Patch Changes

- 38a1065e: Default to the new `hermes` target introduced in esbuild [0.14.48](https://github.com/evanw/esbuild/releases/tag/v0.14.48).

## 0.1.7

### Patch Changes

- 569a099: Bump @rnx-kit/tools-node to v1.2.7

## 0.1.6

### Patch Changes

- e352f4c: Transition tree shaking from experimental to production. Deprecate experimental config/cmdline props, while still supporting them for this major version. They will be removed on the next major version bump. Update documentation and tests.

## 0.1.5

### Patch Changes

- 174a608: Strip out `"use strict"` even when targeting ES6+

## 0.1.4

### Patch Changes

- 48e0c96: Metro does not inject `"use strict"`, but esbuild does. If we're targeting ES5, we should strip them out.

## 0.1.3

### Patch Changes

- b7cc4c5: Add `analyze` option to output a report about the contents of the bundle

## 0.1.2

### Patch Changes

- 1630d25: Manually handle `sideEffects` set to an array of globs as esbuild only accepts boolean values.

## 0.1.1

### Patch Changes

- 7334bdb: Forward `sideEffects` property to help esbuild tree-shake more unused code

## 0.1.0

### Minor Changes

- a50e4a3: Bump esbuild to 0.14.x

## 0.0.23

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/console to v1.0.11

## 0.0.22

Thu, 18 Nov 2021 20:51:05 GMT

### Patches

- Bump @rnx-kit/console to v1.0.10

## 0.0.21

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/console to v1.0.9

## 0.0.20

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Bump @rnx-kit/console to v1.0.8

## 0.0.19

Wed, 03 Nov 2021 18:15:39 GMT

### Patches

- Bump @rnx-kit/console to v1.0.7

## 0.0.18

Mon, 01 Nov 2021 13:46:13 GMT

### Patches

- Normalize main and types fields across all packages which use them. (afoxman@microsoft.com)
- Bump @rnx-kit/console to v1.0.6

## 0.0.17

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Bump @rnx-kit/console to v1.0.5

## 0.0.16

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Bump @rnx-kit/console to v1.0.4

## 0.0.15

Fri, 29 Oct 2021 08:51:30 GMT

### Patches

- Bump @rnx-kit/console to v1.0.3

## 0.0.14

Mon, 23 Aug 2021 17:18:07 GMT

### Patches

- Upgrade esbuild version (sverre.johansen@gmail.com)

## 0.0.13

Fri, 20 Aug 2021 09:36:58 GMT

### Patches

- Fix compatibility issues with Hermes (4123478+tido64@users.noreply.github.com)

## 0.0.12

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/metro-serializer-esbuild to v0.0.12 (4123478+tido64@users.noreply.github.com)

## 0.0.11

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/metro-serializer-esbuild to v0.0.11 (4123478+tido64@users.noreply.github.com)

## 0.0.10

Mon, 12 Jul 2021 21:55:53 GMT

### Patches

- Conditionally add lodash transformer (4123478+tido64@users.noreply.github.com)

## 0.0.9

Mon, 12 Jul 2021 17:30:15 GMT

### Patches

- Correct metro version in peer dependencies (4123478+tido64@users.noreply.github.com)

## 0.0.8

Thu, 08 Jul 2021 11:40:27 GMT

### Patches

- Assert that Metro version is at least 0.66.1 (4123478+tido64@users.noreply.github.com)

## 0.0.7

Thu, 01 Jul 2021 13:59:39 GMT

### Patches

- Fixed Windows paths not being escaped properly (4123478+tido64@users.noreply.github.com)

## 0.0.6

Fri, 25 Jun 2021 14:10:29 GMT

### Patches

- Use the new unstable_disableModuleWrapping flag (4123478+tido64@users.noreply.github.com)

## 0.0.5

Wed, 23 Jun 2021 17:54:11 GMT

### Patches

- Use common console logger (4123478+tido64@users.noreply.github.com)

## 0.0.4

Tue, 22 Jun 2021 15:04:23 GMT

### Patches

- Bumped chalk to 4.1.0 (4123478+tido64@users.noreply.github.com)

## 0.0.3

Tue, 22 Jun 2021 14:59:18 GMT

### Patches

- Filter out modules from other platforms (4123478+tido64@users.noreply.github.com)

## 0.0.2

Thu, 17 Jun 2021 09:08:01 GMT

### Patches

- Help esbuild reduce the bundle size further (4123478+tido64@users.noreply.github.com)

## 0.0.1

Tue, 15 Jun 2021 13:13:23 GMT

### Patches

- Bump @rnx-kit/metro-serializer-esbuild to v0.0.1 (4123478+tido64@users.noreply.github.com)
