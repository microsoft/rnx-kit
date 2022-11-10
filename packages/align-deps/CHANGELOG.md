# Change Log - @rnx-kit/align-deps

## 2.0.1

### Patch Changes

- 430dd69a: Fix not being able to load `microsoft/react-native`

## 2.0.0

### Major Changes

- fbff74c8: `dep-check` has been renamed to `align-deps`

  ### Bug Fixes

  - Improved error messages: Messages should now contain the offending `package.json` and/or the profile causing issues.
  - Diff output has been reduced to only include the relevant sections.

  ### BREAKING CHANGES

  - A new config schema was introduced in this release
    - The old config will still work, but you are advised to migrate as soon as possible
    - The tool will help you migrate your config
    - For more details, read the RFC: https://github.com/microsoft/rnx-kit/blob/rfcs/text/0001-dep-check-v2.md#summary
  - Because of the new config schema, a couple of flags had to be replaced:
    - `--custom-profiles my-preset` is replaced with `--presets microsoft/react-native,my-preset`
    - `--vigilant 0.70` is replaced with `--requirements react-native@0.70`
  - Apps that used to declare multiple react-native versions will now fail
  - Capabilities that are declared at the root of the preset are no longer supported

## 1.13.1

### Patch Changes

- fda5a3fb: `@types/react-native` won't be needed from 0.71 on
- 86bf8afa: Bump `react-native-safe-area-context` for 0.70

## 1.13.0

### Minor Changes

- 127b2bee: Do not warn for recent react-native-linear-gradient versions

## 1.12.23

### Patch Changes

- c067c1be: Allow specifying multiple packages on command line

## 1.12.22

### Patch Changes

- 17b7666f: react-native-gesture-handler 2.6.0 supports react-native 0.70

## 1.12.21

### Patch Changes

- e78e4dae: Added profile for react-native 0.70
- e3fd2c45: change file not found error to warning

## 1.12.20

### Patch Changes

- cc0ac7bf: - 0.68
  - @react-native-clipboard/clipboard -> ^1.10
  - react-native-svg -> ^12.3
  - react-native-webview -> ^11.22.6
  - 0.69
    - @react-native-async-storage/async-storage -> ^1.17.7
    - @react-native-masked-view/masked-view -> ^0.2.7
    - react-native-reanimated -> ^2.9
    - react-native-screens -> ^3.14.1
    - react-native-webview -> ^11.23

## 1.12.19

### Patch Changes

- ac77ec69: Bump for a build with latest @rnx-kit dependencies

## 1.12.18

### Patch Changes

- 37245c33: Introducing `@rnx-kit/tools-workspaces`, a collection of tools for working with workspaces.

## 1.12.17

### Patch Changes

- 641edba5: Add profile for react-native 0.69

## 1.12.16

### Patch Changes

- 1edb9acd: Fix dep-check failing to visit dependencies in a repository using pnpm or pnpm-like solutions

## 1.12.15

### Patch Changes

- 4b777cf9: Bumps `@react-navigation/native` and `@react-navigation/stack` to 6.0.8 and 6.2.0 respectively for 0.66.

## 1.12.14

### Patch Changes

- 569a099: Bump @rnx-kit/tools-node to v1.2.7

## 1.12.13

### Patch Changes

- cb795e3: Omit empty sections from the manifest

## 1.12.12

### Patch Changes

- 3ee09f6: Fix Rush workspaces not being detected when set up as a post-install step

## 1.12.11

### Patch Changes

- d950055: Dependencies should be sorted lexicographically

## 1.12.10

### Patch Changes

- d48475b: Allow specifying `--custom-profiles` with `--init`

## 1.12.9

### Patch Changes

- b09c0bb: react-native-gestures 2.3.0 works with react-native 0.68
- b09c0bb: reanimated 2.5.0 supports react-native 0.68
- b09c0bb: react-native-screens 3.13.1 now supports Fabric

## 1.12.8

### Patch Changes

- 4a2bd9a: react-native-lazy-index was renamed to @rnx-kit/react-native-lazy-index

## 1.12.7

### Patch Changes

- 2169c8f: Add more descriptive error message when validating manifest

## 1.12.6

### Patch Changes

- a4988f1: Explicitly declare support for Node 12+
- 89af18f: Fix dev version being set regardless of whether a package was configured when running in `--vigilant` mode

## 1.12.5

### Patch Changes

- 3b43647: Keep version ranges defined in `peerDependencies` if they are a superset
- 6bddfc6: Fix dev version not being set correctly in `--vigilant` mode

## 1.12.4

### Patch Changes

- 0eb8b8b: Bump workspace-tools to 0.18.2 for performance improvements
- 64ce5a1: Bump react-native-screens for 0.66 and 0.68

## 1.12.3

### Patch Changes

- 4c747fd: Add profile for react-native 0.68
- 730a167: Also look for react-native under `devDependencies`

## 1.12.2

### Patch Changes

- b7e60e9: Don't fail on profiles that contain only common dependencies

## 1.12.1

### Patch Changes

- 55106b7: Bump react-native-test-app to 1.0.6 to fix Gradle running out of heap space during the lint task on some machines.

## 1.12.0

### Minor Changes

- f385a26: Allow declaring common capabilities at the root level

### Patch Changes

- 868be32: Bump react-native-test-app to 0.11.4 to support react-native-macos 0.66
- d10f4b0: Use react-native-test-app 1.0 from react-native 0.66+

## 1.11.0

### Minor Changes

- ca8c634: dep-check should pick up `customProfiles` when running in `--vigilant` mode to allow individual packages to use different profiles without having to re-declare which React Native versions they support.

### Patch Changes

- 0f7793e: Bump react-native-test-app 0.11.2 to support react-native 0.67

## 1.10.2

### Patch Changes

- feb1613: fix(dep-check): bump react-native-test-app to 0.11.0

## 1.10.1

### Patch Changes

- 80a9e64: Bump react-native-test-app to 0.10.2
- 8f868c4: Bump react-native-test-app to 0.10.1

## 1.10.0

### Minor Changes

- 32b681b: All dependencies of all packages, including configured ones, should be checked when `--vigilant` is specified.

## 1.9.6

### Patch Changes

- 9816461: Fix loading of custom profiles from relative paths

## 1.9.5

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/console to v1.0.11
- Bump @rnx-kit/tools-language to v1.2.6
- Bump @rnx-kit/tools-node to v1.2.6

## 1.9.4

Thu, 18 Nov 2021 20:51:05 GMT

### Patches

- Bump @rnx-kit/console to v1.0.10
- Bump @rnx-kit/tools-language to v1.2.5
- Bump @rnx-kit/tools-node to v1.2.5

## 1.9.3

Tue, 16 Nov 2021 14:33:15 GMT

### Patches

- Bump netinfo to fix autolinking on Windows (4123478+tido64@users.noreply.github.com)

## 1.9.2

Mon, 15 Nov 2021 12:33:07 GMT

### Patches

- Bump clipboard for react-native update fixes (4123478+tido64@users.noreply.github.com)

## 1.9.1

Fri, 12 Nov 2021 13:04:39 GMT

### Patches

- Fix dep-check not being executable (4123478+tido64@users.noreply.github.com)

## 1.9.0

Thu, 11 Nov 2021 17:49:21 GMT

### Minor changes

- Bundle dep-check to avoid conflicting dependencies, and to make the installation footprint smaller. (4123478+tido64@users.noreply.github.com)

## 1.8.18

Mon, 08 Nov 2021 10:20:15 GMT

### Patches

- Bump @rnx-kit/config to v0.4.19

## 1.8.17

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/config to v0.4.18
- Bump @rnx-kit/console to v1.0.9
- Bump @rnx-kit/tools-language to v1.2.4
- Bump @rnx-kit/tools-node to v1.2.4

## 1.8.16

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Bump @rnx-kit/config to v0.4.17
- Bump @rnx-kit/console to v1.0.8
- Bump @rnx-kit/tools-language to v1.2.3
- Bump @rnx-kit/tools-node to v1.2.3

## 1.8.15

Wed, 03 Nov 2021 18:15:39 GMT

### Patches

- Bump @rnx-kit/config to v0.4.16
- Bump @rnx-kit/console to v1.0.7
- Bump @rnx-kit/tools-language to v1.2.2
- Bump @rnx-kit/tools-node to v1.2.2

## 1.8.14

Mon, 01 Nov 2021 13:46:13 GMT

### Patches

- Bump @rnx-kit/config to v0.4.15
- Bump @rnx-kit/console to v1.0.6
- Bump @rnx-kit/tools-language to v1.2.1
- Bump @rnx-kit/tools-node to v1.2.1

## 1.8.13

Sat, 30 Oct 2021 07:50:51 GMT

### Patches

- Bump @rnx-kit/config to v0.4.14
- Bump @rnx-kit/tools-language to v1.2.0
- Bump @rnx-kit/tools-node to v1.2.0

## 1.8.12

Fri, 29 Oct 2021 14:13:32 GMT

### Patches

- Recommend react-native-reanimated@^2.2.4 for 0.67 (4123478+tido64@users.noreply.github.com)

## 1.8.11

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Bump @rnx-kit/config to v0.4.13
- Bump @rnx-kit/console to v1.0.5
- Bump @rnx-kit/tools-language to v1.1.4
- Bump @rnx-kit/tools-node to v1.1.6

## 1.8.10

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Bump @rnx-kit/config to v0.4.12
- Bump @rnx-kit/console to v1.0.4
- Bump @rnx-kit/tools-language to v1.1.3
- Bump @rnx-kit/tools-node to v1.1.5

## 1.8.9

Fri, 29 Oct 2021 08:51:30 GMT

### Patches

- Bump @rnx-kit/config to v0.4.11
- Bump @rnx-kit/console to v1.0.3
- Bump @rnx-kit/tools-language to v1.1.2
- Bump @rnx-kit/tools-node to v1.1.4

## 1.8.8

Tue, 26 Oct 2021 17:22:16 GMT

### Patches

- Bumped react-native-reanimated for 0.66, and added profile for 0.67 (4123478+tido64@users.noreply.github.com)

## 1.8.7

Thu, 14 Oct 2021 07:54:03 GMT

### Patches

- Bump react-native-test-app to ^0.9.0 (4123478+tido64@users.noreply.github.com)

## 1.8.6

Wed, 29 Sep 2021 11:02:41 GMT

### Patches

- add jest, add meta for core testing, stabilize core with react capability (lsciandra@microsoft.com)
- Bump @rnx-kit/config to v0.4.10

## 1.8.5

Wed, 29 Sep 2021 09:09:11 GMT

### Patches

- Make profile for 0.66 public (4123478+tido64@users.noreply.github.com)

## 1.8.4

Mon, 27 Sep 2021 12:28:41 GMT

### Patches

- Add react dom and test renderer to capabilities (lsciandra@microsoft.com)
- Bump @rnx-kit/config to v0.4.9

## 1.8.3

Mon, 27 Sep 2021 10:56:47 GMT

### Patches

- Add metro babel preset to capabilities (lsciandra@microsoft.com)
- Bump @rnx-kit/config to v0.4.8

## 1.8.2

Tue, 14 Sep 2021 15:28:16 GMT

### Patches

- Bump async-storage to 1.15.8. It contains fixes for building Android on react-native 0.65. (4123478+tido64@users.noreply.github.com)

## 1.8.1

Mon, 13 Sep 2021 17:38:26 GMT

### Patches

- Updated profile 0.65 with latest versions. Added a preliminary profile for 0.66. (4123478+tido64@users.noreply.github.com)

## 1.8.0

Wed, 08 Sep 2021 07:04:15 GMT

### Minor changes

- Add support for dependencies and meta packages (4123478+tido64@users.noreply.github.com)

## 1.7.11

Wed, 08 Sep 2021 06:42:50 GMT

### Patches

- Also check workspace root package (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/dep-check to v1.7.11 (4123478+tido64@users.noreply.github.com)

## 1.7.10

Mon, 06 Sep 2021 06:57:59 GMT

### Patches

- When upgrading profile version, also remove `reactNativeDevVersion` if `kitType` is `app` (4123478+tido64@users.noreply.github.com)

## 1.7.9

Fri, 03 Sep 2021 12:18:30 GMT

### Patches

- Preserve the indentation when modifying `package.json` (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/dep-check to v1.7.9 (4123478+tido64@users.noreply.github.com)

## 1.7.8

Fri, 03 Sep 2021 09:49:28 GMT

### Patches

- Fix broken `--init` due to loose and init being mutually exclusive, but `--loose` has a default value. (4123478+tido64@users.noreply.github.com)

## 1.7.7

Tue, 31 Aug 2021 10:50:41 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.7.7 (4123478+tido64@users.noreply.github.com)

## 1.7.6

Tue, 31 Aug 2021 06:43:13 GMT

### Patches

- Stricter handling of errors (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/dep-check to v1.7.6 (4123478+tido64@users.noreply.github.com)

## 1.7.5

Fri, 27 Aug 2021 18:41:43 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.7.5 (4123478+tido64@users.noreply.github.com)

## 1.7.4

Wed, 25 Aug 2021 08:52:48 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.7.4 (afoxman@microsoft.com)

## 1.7.3

Wed, 25 Aug 2021 07:32:57 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.7.3 (afoxman@microsoft.com)

## 1.7.2

Sat, 21 Aug 2021 08:22:48 GMT

### Patches

- Integrate tools package and other common libraries throughout monorepo, removing custom code. (afoxman@microsoft.com)
- Bump @rnx-kit/dep-check to v1.7.2 (afoxman@microsoft.com)

## 1.7.1

Thu, 19 Aug 2021 07:59:20 GMT

### Patches

- Fix error messages accumulating when gathering requirements (4123478+tido64@users.noreply.github.com)

## 1.7.0

Wed, 18 Aug 2021 14:54:20 GMT

### Minor changes

- Allow apps to depend on a newer version of React Native than their dependencies declare support for via the `--loose` flag. (4123478+tido64@users.noreply.github.com)

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
