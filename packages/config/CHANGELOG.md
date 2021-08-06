# Change Log - @rnx-kit/config

This log was last generated on Fri, 06 Aug 2021 22:07:45 GMT and should not be manually modified.

<!-- Start content -->

## 0.4.0

Fri, 06 Aug 2021 22:07:45 GMT

### Minor changes

- Add server config types, functions and tests to kit config. (afoxman@microsoft.com)

## 0.3.5

Fri, 06 Aug 2021 18:05:53 GMT

### Patches

- Refactor config types, pulling out bundler runtime parameters. This does not impact the package API, but is important for the upcoming Metro server work. Add tests for the bundle definition code. Move existing tests into their own directory, and update jest config and snapshots. (afoxman@microsoft.com)

## 0.3.4

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/config to v0.3.4 (4123478+tido64@users.noreply.github.com)

## 0.3.3

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/config to v0.3.3 (4123478+tido64@users.noreply.github.com)

## 0.3.2

Mon, 26 Jul 2021 15:59:59 GMT

### Patches

- Add 'core' as an alias for react-native for out-of-tree platform packages that have a dependency on `react-native` core code, and not the Android/iOS specific bits. Currently, one would have to add a random capability that resolves to `react-native`, e.g. `core-android`, despite the capability not really being used. (4123478+tido64@users.noreply.github.com)

## 0.3.1

Mon, 12 Jul 2021 17:30:15 GMT

### Patches

- Added flag for enabling experimental tree shake (4123478+tido64@users.noreply.github.com)

## 0.3.0

Mon, 12 Jul 2021 07:51:46 GMT

### Minor changes

- Bump @rnx-kit/config to v0.3.0 (afoxman@microsoft.com)

## 0.2.9

Fri, 04 Jun 2021 12:36:37 GMT

### Patches

- Fixed error when React Native dev version is a range (4123478+tido64@users.noreply.github.com)

## 0.2.8

Wed, 26 May 2021 13:22:22 GMT

### Patches

- Removed core-win32 capability (4123478+tido64@users.noreply.github.com)

## 0.2.7

Wed, 26 May 2021 06:53:03 GMT

### Patches

- Added support for custom profiles (4123478+tido64@users.noreply.github.com)

## 0.2.6

Wed, 05 May 2021 19:51:01 GMT

### Patches

- Add getKitCapabilities() (4123478+tido64@users.noreply.github.com)

## 0.2.5

Wed, 28 Apr 2021 15:54:06 GMT

### Patches

- Add 'hermes' capability (4123478+tido64@users.noreply.github.com)

## 0.2.4

Tue, 27 Apr 2021 19:43:40 GMT

### Patches

- Added support for RN SDK (4123478+tido64@users.noreply.github.com)

## 0.2.3

Tue, 27 Apr 2021 09:54:28 GMT

### Patches

- Bump workspace-tools to 0.15.0 (4123478+tido64@users.noreply.github.com)

## 0.2.2

Fri, 09 Apr 2021 21:41:43 GMT

### Patches

- Fix return type of getBundleDefinition() and getBundlePlatformDefinition() (4123478+tido64@users.noreply.github.com)

## 0.2.1

Thu, 11 Mar 2021 22:58:41 GMT

### Patches

- Add pass-through params to rnx-bundle, giving the caller control over all aspects of metro bundling. (afoxman@microsoft.com)

## 0.2.0

Wed, 10 Mar 2021 18:05:17 GMT

### Minor changes

- Change CLI args from camelCase to kebab-case. Add win32 as a platform. (afoxman@microsoft.com)

## 0.1.2

Mon, 22 Feb 2021 10:50:46 GMT

### Patches

- Add strictNullChecks and noImplicitAny to the shared tsconfig. Remove from metro-config. Fix code to meet more strict type checks. (afoxman@microsoft.com)

## 0.1.1

Fri, 19 Feb 2021 19:58:00 GMT

### Patches

- Create a CLI package which self-registers with @react-native-community/cli. Add bundling commands 'rnx-bundle' and 'rnx-start' which invoke metro. Move bundle code from build system to CLI package. (afoxman@microsoft.com)

## 0.1.0

Tue, 16 Feb 2021 19:15:57 GMT

### Minor changes

- Add bundle config to the kit config. (afoxman@microsoft.com)

## 0.0.3

Tue, 16 Feb 2021 19:03:38 GMT

### Patches

- Move typescript settings from tscTask to tsconfig.json. Remove the use of baseUrl and paths, which we don't need. Fix path in fast-install script. Update test-app-mobile dependencies and move all source files into an 'src' directory. (afoxman@microsoft.com)

## 0.0.2

Thu, 28 Jan 2021 17:02:45 GMT

### Patches

- add start of config package (jasonmo@microsoft.com)
