# Change Log - @rnx-kit/dep-check

This log was last generated on Tue, 17 Aug 2021 09:36:56 GMT and should not be manually modified.

<!-- Start content -->

## 1.6.0

Tue, 17 Aug 2021 09:36:56 GMT

### Minor changes

- Add command for setting react-native version (4123478+tido64@users.noreply.github.com)

## 1.5.21

Fri, 13 Aug 2021 13:30:40 GMT

### Patches

- Correct hermes-engine version for react-native 0.65 (4123478+tido64@users.noreply.github.com)

## 1.5.20

Fri, 06 Aug 2021 22:07:45 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.20 (afoxman@microsoft.com)

## 1.5.19

Fri, 06 Aug 2021 18:05:53 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.19 (afoxman@microsoft.com)

## 1.5.18

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.18 (4123478+tido64@users.noreply.github.com)

## 1.5.17

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.17 (4123478+tido64@users.noreply.github.com)

## 1.5.16

Mon, 26 Jul 2021 15:59:59 GMT

### Patches

- Add 'core' as an alias for react-native for out-of-tree platform packages that have a dependency on `react-native` core code, and not the Android/iOS specific bits. Currently, one would have to add a random capability that resolves to `react-native`, e.g. `core-android`, despite the capability not really being used. (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/dep-check to v1.5.16 (4123478+tido64@users.noreply.github.com)

## 1.5.15

Tue, 13 Jul 2021 13:40:11 GMT

### Patches

- bump RNTA to 0.7 (lsciandra@microsoft.com)

## 1.5.14

Mon, 12 Jul 2021 17:30:15 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.14 (4123478+tido64@users.noreply.github.com)

## 1.5.13

Mon, 12 Jul 2021 08:34:12 GMT

### Patches

- Added link to documentation in output (4123478+tido64@users.noreply.github.com)

## 1.5.12

Mon, 12 Jul 2021 07:51:46 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.5.12 (afoxman@microsoft.com)

## 1.5.11

Fri, 09 Jul 2021 12:17:59 GMT

### Patches

- Bump checkbox and test-app to latest (4123478+tido64@users.noreply.github.com)

## 1.5.10

Thu, 01 Jul 2021 13:59:39 GMT

### Patches

- Bump netinfo to 5.9.10 (4123478+tido64@users.noreply.github.com)

## 1.5.9

Mon, 28 Jun 2021 14:19:44 GMT

### Patches

- Added missing dependency (4123478+tido64@users.noreply.github.com)

## 1.5.8

Fri, 25 Jun 2021 16:53:16 GMT

### Patches

- Bump react-native-test-app to 0.6.3 (4123478+tido64@users.noreply.github.com)

## 1.5.7

Wed, 23 Jun 2021 17:54:11 GMT

### Patches

- Use common console logger (4123478+tido64@users.noreply.github.com)

## 1.5.6

Tue, 22 Jun 2021 15:04:23 GMT

### Patches

- Bumped chalk to 4.1.0, and workspace-tools to 0.16.2 (4123478+tido64@users.noreply.github.com)

## 1.5.5

Mon, 21 Jun 2021 17:32:05 GMT

### Patches

- Promote @react-native-masked-view/masked-view over @react-native-community/masked-view (4123478+tido64@users.noreply.github.com)

## 1.5.4

Mon, 21 Jun 2021 11:43:28 GMT

### Patches

- Warn about renamed packages: `@react-native-community/async-storage` -> `@react-native-async-storage/async-storage` and `@react-native-community/masked-view` -> `@react-native-masked-view/masked-view` (4123478+tido64@users.noreply.github.com)

## 1.5.3

Thu, 17 Jun 2021 06:05:20 GMT

### Patches

- Bumped react-native 0.64.1 -> 0.64.2 (4123478+tido64@users.noreply.github.com)

## 1.5.2

Fri, 04 Jun 2021 12:36:37 GMT

### Patches

- Fixed older yargs versions not ignoring flags with default values when looking for conflicts (4123478+tido64@users.noreply.github.com)

## 1.5.1

Fri, 04 Jun 2021 09:02:33 GMT

### Patches

- Added --exclude-packages to vigilant mode (4123478+tido64@users.noreply.github.com)

## 1.5.0

Wed, 02 Jun 2021 17:08:58 GMT

### Minor changes

- Add --vigilant flag for zero-config mode (4123478+tido64@users.noreply.github.com)

## 1.4.2

Thu, 27 May 2021 06:09:59 GMT

### Patches

- Fix 'devOnly' being ignored in custom profiles (4123478+tido64@users.noreply.github.com)

## 1.4.1

Wed, 26 May 2021 13:22:22 GMT

### Patches

- Removed core-win32 capability (4123478+tido64@users.noreply.github.com)

## 1.4.0

Wed, 26 May 2021 06:53:03 GMT

### Minor changes

- Added support for custom profiles (4123478+tido64@users.noreply.github.com)

### Patches

- Bump @rnx-kit/config to v0.2.7 (4123478+tido64@users.noreply.github.com)

## 1.3.0

Thu, 20 May 2021 16:06:43 GMT

### Minor changes

- Add support for workspaces (4123478+tido64@users.noreply.github.com)

## 1.2.2

Thu, 20 May 2021 15:24:25 GMT

### Patches

- Bump react-native-test-app to 0.5.9 to address an issue with linters complaining about an old version of Dagger being used. (4123478+tido64@users.noreply.github.com)

## 1.2.1

Tue, 18 May 2021 09:25:17 GMT

### Patches

- Ignore whitespace differences (4123478+tido64@users.noreply.github.com)

## 1.2.0

Sat, 15 May 2021 09:02:22 GMT

### Minor changes

- Added command for initializing a configuration (4123478+tido64@users.noreply.github.com)

## 1.1.10

Sat, 15 May 2021 08:55:08 GMT

### Patches

- Print instructions when changes are needed. (4123478+tido64@users.noreply.github.com)

## 1.1.9

Sat, 15 May 2021 08:49:14 GMT

### Patches

- Exclude dev-only capabilities from requirements (4123478+tido64@users.noreply.github.com)

## 1.1.8

Wed, 12 May 2021 11:52:17 GMT

### Patches

- Avoid installing unnecessary core capabilities (4123478+tido64@users.noreply.github.com)

## 1.1.7

Tue, 11 May 2021 15:41:12 GMT

### Patches

- Bump react-native-test-app for Xcode 12.5 fixes (4123478+tido64@users.noreply.github.com)

## 1.1.6

Tue, 11 May 2021 15:28:18 GMT

### Patches

- Allow dev-only dependencies should always be added (4123478+tido64@users.noreply.github.com)
- Rollback @react-navigation/native as 5.9.6 doesn't exist (4123478+tido64@users.noreply.github.com)

## 1.1.5

Mon, 10 May 2021 21:58:48 GMT

### Patches

- Allow direct dependency on react-native-test-app (4123478+tido64@users.noreply.github.com)

## 1.1.4

Mon, 10 May 2021 14:10:30 GMT

### Patches

- Libraries should not re-declare transitive dependencies (4123478+tido64@users.noreply.github.com)

## 1.1.3

Sat, 08 May 2021 20:35:26 GMT

### Patches

- Fix a crash in react-native-lazy-index when non-JS files are read (4123478+tido64@users.noreply.github.com)

## 1.1.2

Wed, 05 May 2021 21:00:14 GMT

### Patches

- Add preliminary profile for 0.65 (4123478+tido64@users.noreply.github.com)

## 1.1.1

Wed, 05 May 2021 20:55:03 GMT

### Patches

- Bump react-native to address build issues with Xcode 12.5 (4123478+tido64@users.noreply.github.com)

## 1.1.0

Wed, 05 May 2021 19:51:01 GMT

### Minor changes

- Apply transitive requirements (4123478+tido64@users.noreply.github.com)

### Patches

- Bump @rnx-kit/config to v0.2.6 (4123478+tido64@users.noreply.github.com)

## 1.0.3

Thu, 29 Apr 2021 13:47:02 GMT

### Patches

- Bump react-native to latest 0.63.x (4123478+tido64@users.noreply.github.com)

## 1.0.2

Wed, 28 Apr 2021 16:03:56 GMT

### Patches

- Expose cli for cli related integrations (4123478+tido64@users.noreply.github.com)

## 1.0.1

Wed, 28 Apr 2021 15:54:06 GMT

### Patches

- Add 'hermes' capability (4123478+tido64@users.noreply.github.com)

## 1.0.0

Tue, 27 Apr 2021 19:43:40 GMT

### Minor changes

- Initial dependency checker (4123478+tido64@users.noreply.github.com)

### Patches

- Bump @rnx-kit/config to v0.2.4 (4123478+tido64@users.noreply.github.com)
