# Change Log - @rnx-kit/metro-service

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
