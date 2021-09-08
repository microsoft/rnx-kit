# Change Log - @rnx-kit/cli

This log was last generated on Wed, 08 Sep 2021 07:04:15 GMT and should not be manually modified.

<!-- Start content -->

## 0.9.26

Wed, 08 Sep 2021 07:04:15 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.26 (4123478+tido64@users.noreply.github.com)

## 0.9.25

Mon, 06 Sep 2021 06:57:59 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.25 (4123478+tido64@users.noreply.github.com)

## 0.9.24

Fri, 03 Sep 2021 12:18:30 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.24 (4123478+tido64@users.noreply.github.com)

## 0.9.23

Fri, 03 Sep 2021 09:49:28 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.23 (4123478+tido64@users.noreply.github.com)

## 0.9.22

Tue, 31 Aug 2021 10:50:41 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.22 (4123478+tido64@users.noreply.github.com)

## 0.9.21

Tue, 31 Aug 2021 06:43:13 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.21 (4123478+tido64@users.noreply.github.com)

## 0.9.20

Fri, 27 Aug 2021 18:41:43 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.20 (4123478+tido64@users.noreply.github.com)

## 0.9.19

Thu, 26 Aug 2021 17:24:29 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.19 (dannyvv@microsoft.com)

## 0.9.18

Wed, 25 Aug 2021 08:52:48 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.18 (afoxman@microsoft.com)

## 0.9.17

Wed, 25 Aug 2021 08:31:56 GMT

### Patches

- Make `@react-native-community/cli-server-api` optional. We want to prevent cli from installing an extra copy, and also not require the user to explicitly add it to their dependencies. Since we're running inside `@react-native-community/cli`, it is reasonable to assume that this package will be installed. And if it isn't, we need to update our code anyway. (4123478+tido64@users.noreply.github.com)

## 0.9.16

Wed, 25 Aug 2021 07:32:57 GMT

### Patches

- Create a new type to encapsulate everything needed for bundling. Use this as the main type for driving metro bundle runs in the rnxBundle loop. (afoxman@microsoft.com)
- Bump @rnx-kit/cli to v0.9.16 (afoxman@microsoft.com)

## 0.9.15

Tue, 24 Aug 2021 09:20:39 GMT

### Patches

- Combine all kit config retrieval under getKitBundleConfigs. Move "apply overrides" out of the config loop. When applying overrides, do it across all kit bundle configs, not just one at a time. (afoxman@microsoft.com)

## 0.9.14

Tue, 24 Aug 2021 08:15:03 GMT

### Patches

- Create type KitBundleConfig which combines a platform and its bundle configuration. Update rnxBundle to build a set of these, and apply command-line overrides to each one. Add/update related tests. (afoxman@microsoft.com)

## 0.9.13

Mon, 23 Aug 2021 18:57:47 GMT

### Patches

- Fix type-checking on windows (afoxman@microsoft.com)

## 0.9.12

Mon, 23 Aug 2021 18:18:31 GMT

### Patches

- Fix targeting bug in bundle command (afoxman@microsoft.com)

## 0.9.11

Mon, 23 Aug 2021 17:40:48 GMT

### Patches

- Update serializer hook to do full TypeScript validation with platform override support as well as module-name substitution support (afoxman@microsoft.com)
- Bump @rnx-kit/cli to v0.9.11 (afoxman@microsoft.com)

## 0.9.10

Mon, 23 Aug 2021 17:18:07 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.10 (sverre.johansen@gmail.com)

## 0.9.9

Mon, 23 Aug 2021 08:49:21 GMT

### Patches

- `--experimental-tree-shake` shouldn't need extra config (4123478+tido64@users.noreply.github.com)

## 0.9.8

Sat, 21 Aug 2021 08:22:48 GMT

### Patches

- Integrate tools package and other common libraries throughout monorepo, removing custom code. (afoxman@microsoft.com)
- Bump @rnx-kit/cli to v0.9.8 (afoxman@microsoft.com)

## 0.9.7

Fri, 20 Aug 2021 09:36:58 GMT

### Patches

- Fix `--experimental-tree-shake` not being applied correctly (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.9.7 (4123478+tido64@users.noreply.github.com)

## 0.9.6

Thu, 19 Aug 2021 07:59:20 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.6 (4123478+tido64@users.noreply.github.com)

## 0.9.5

Wed, 18 Aug 2021 14:54:20 GMT

### Patches

- Allow apps to depend on a newer version of React Native than their dependencies declare support for via the `--loose` flag. (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.9.5 (4123478+tido64@users.noreply.github.com)

## 0.9.4

Tue, 17 Aug 2021 20:18:02 GMT

### Patches

- Fix `rnx-test` failing under Jest 27 (4123478+tido64@users.noreply.github.com)

## 0.9.3

Tue, 17 Aug 2021 09:36:56 GMT

### Patches

- Fix arguments not being properly forwarded to dep-check (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.9.3 (4123478+tido64@users.noreply.github.com)

## 0.9.2

Mon, 16 Aug 2021 14:17:13 GMT

### Patches

- Bump @rnx-kit/console to 1.0.2 (4123478+tido64@users.noreply.github.com)

## 0.9.1

Fri, 13 Aug 2021 13:30:40 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.1 (4123478+tido64@users.noreply.github.com)

## 0.9.0

Fri, 06 Aug 2021 22:07:45 GMT

### Minor changes

- Add `rnx-start` command to CLI. Update docs (afoxman@microsoft.com)
- Bump @rnx-kit/cli to v0.9.0 (afoxman@microsoft.com)

## 0.8.0

Fri, 06 Aug 2021 18:23:09 GMT

### Minor changes

- Refactor bundle command, moving kit and metro config logic to separate files. Add failure when no target platform is given. Remove command-line props which have no effect. Remove Metro config validation as it isn't workable with all the props we override. Update Metro hook function to track one TS project per platform. Fix Metro hook function: incorrectly using modified to delete file from TS project. Change @rnx-kit dependencies to semver ranges. (afoxman@microsoft.com)

## 0.7.1

Fri, 06 Aug 2021 18:05:53 GMT

### Patches

- Bump @rnx-kit/cli to v0.7.1 (afoxman@microsoft.com)

## 0.7.0

Fri, 06 Aug 2021 17:50:49 GMT

### Minor changes

- Remove props which have no effect from bundle command. (afoxman@microsoft.com)
- Bump @rnx-kit/cli to v0.7.0 (afoxman@microsoft.com)

## 0.6.8

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/cli to v0.6.8 (4123478+tido64@users.noreply.github.com)

## 0.6.7

Mon, 02 Aug 2021 11:18:46 GMT

### Patches

- jest-cli allows passing argv directly to run() (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.6.7 (4123478+tido64@users.noreply.github.com)

## 0.6.6

Fri, 30 Jul 2021 18:00:51 GMT

### Patches

- Add JSON output format to `rnx-write-third-party-notices` (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.6.6 (4123478+tido64@users.noreply.github.com)

## 0.6.5

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Add `rnx-test` command for running Jest with React Native platform awareness (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/cli to v0.6.5 (4123478+tido64@users.noreply.github.com)

## 0.6.4

Mon, 26 Jul 2021 15:59:59 GMT

### Patches

- Bump @rnx-kit/cli to v0.6.4 (4123478+tido64@users.noreply.github.com)

## 0.6.3

Thu, 22 Jul 2021 16:59:25 GMT

### Patches

- Bump @rnx-kit/cli to v0.6.3 (4123478+tido64@users.noreply.github.com)

## 0.6.2

Fri, 16 Jul 2021 21:45:40 GMT

### Patches

- Bump @rnx-kit/cli to v0.6.2 (4123478+tido64@users.noreply.github.com)

## 0.6.1

Tue, 13 Jul 2021 17:31:45 GMT

### Patches

- Bump @rnx-kit/cli to v0.6.1 (afoxman@microsoft.com)

## 0.6.0

Tue, 13 Jul 2021 17:03:23 GMT

### Minor changes

- Bump @rnx-kit/cli to v0.6.0 (afoxman@microsoft.com)

## 0.5.36

Tue, 13 Jul 2021 13:40:11 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.36 (lsciandra@microsoft.com)

## 0.5.35

Mon, 12 Jul 2021 21:55:53 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.35 (4123478+tido64@users.noreply.github.com)

## 0.5.34

Mon, 12 Jul 2021 17:30:15 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.34 (4123478+tido64@users.noreply.github.com)

## 0.5.33

Mon, 12 Jul 2021 08:34:12 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.33 (4123478+tido64@users.noreply.github.com)

## 0.5.32

Mon, 12 Jul 2021 07:51:46 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.32 (afoxman@microsoft.com)

## 0.5.31

Fri, 09 Jul 2021 12:17:59 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.31 (4123478+tido64@users.noreply.github.com)

## 0.5.30

Thu, 01 Jul 2021 13:59:39 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.30 (4123478+tido64@users.noreply.github.com)

## 0.5.29

Tue, 29 Jun 2021 06:01:48 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.29 (afoxman@microsoft.com)

## 0.5.28

Mon, 28 Jun 2021 14:19:44 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.28 (4123478+tido64@users.noreply.github.com)

## 0.5.27

Fri, 25 Jun 2021 16:53:16 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.27 (4123478+tido64@users.noreply.github.com)

## 0.5.26

Wed, 23 Jun 2021 17:54:11 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.26 (4123478+tido64@users.noreply.github.com)

## 0.5.25

Tue, 22 Jun 2021 15:04:23 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.25 (4123478+tido64@users.noreply.github.com)

## 0.5.24

Mon, 21 Jun 2021 17:32:05 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.24 (4123478+tido64@users.noreply.github.com)

## 0.5.23

Mon, 21 Jun 2021 11:43:28 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.23 (4123478+tido64@users.noreply.github.com)

## 0.5.22

Thu, 17 Jun 2021 06:05:20 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.22 (4123478+tido64@users.noreply.github.com)

## 0.5.21

Sat, 05 Jun 2021 08:39:15 GMT

### Patches

- Bump @rnx-kit/cli to v0.5.21 (dannyvv@microsoft.com)

## 0.5.20

Fri, 04 Jun 2021 12:36:37 GMT

### Patches

- Bump @rnx-kit/config to v0.2.9 (4123478+tido64@users.noreply.github.com)

## 0.5.19

Fri, 04 Jun 2021 09:02:33 GMT

### Patches

- dep-check: Added --exclude-packages to vigilant mode (4123478+tido64@users.noreply.github.com)

## 0.5.18

Wed, 02 Jun 2021 17:08:58 GMT

### Patches

- Forward --init, --vigilant, --custom-profiles flags dep-check (4123478+tido64@users.noreply.github.com)

## 0.5.17

Thu, 27 May 2021 06:09:59 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.4.2 (4123478+tido64@users.noreply.github.com)

## 0.5.16

Wed, 26 May 2021 13:22:22 GMT

### Patches

- Bump @rnx-kit/config to v0.2.8 (4123478+tido64@users.noreply.github.com)

## 0.5.15

Wed, 26 May 2021 06:53:03 GMT

### Patches

- Bump @rnx-kit/config to v0.2.7 (4123478+tido64@users.noreply.github.com)

## 0.5.14

Thu, 20 May 2021 16:06:43 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.3.0 (4123478+tido64@users.noreply.github.com)

## 0.5.13

Thu, 20 May 2021 15:24:25 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.2.2 (4123478+tido64@users.noreply.github.com)

## 0.5.12

Tue, 18 May 2021 18:41:27 GMT

### Patches

- Removed unused react-native dependency (4123478+tido64@users.noreply.github.com)

## 0.5.11

Tue, 18 May 2021 09:25:17 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.2.1 (4123478+tido64@users.noreply.github.com)

## 0.5.10

Sat, 15 May 2021 09:02:22 GMT

### Patches

- dep-check: Added command for initializing a configuration (4123478+tido64@users.noreply.github.com)

## 0.5.9

Sat, 15 May 2021 08:55:08 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.10 (4123478+tido64@users.noreply.github.com)

## 0.5.8

Sat, 15 May 2021 08:49:14 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.9 (4123478+tido64@users.noreply.github.com)

## 0.5.7

Wed, 12 May 2021 11:52:17 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.8 (4123478+tido64@users.noreply.github.com)

## 0.5.6

Tue, 11 May 2021 17:21:45 GMT

### Patches

- Fix a bug in handling the optional source map parameter. (afoxman@microsoft.com)

## 0.5.5

Tue, 11 May 2021 15:41:12 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.7 (4123478+tido64@users.noreply.github.com)

## 0.5.4

Tue, 11 May 2021 15:28:18 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.6 (4123478+tido64@users.noreply.github.com)

## 0.5.3

Mon, 10 May 2021 21:58:48 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.5 (4123478+tido64@users.noreply.github.com)

## 0.5.2

Mon, 10 May 2021 14:10:30 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.4 (4123478+tido64@users.noreply.github.com)

## 0.5.1

Sat, 08 May 2021 20:35:26 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.3 (4123478+tido64@users.noreply.github.com)

## 0.5.0

Thu, 06 May 2021 16:54:17 GMT

### Minor changes

- Port third-party-notice extraction logic to rnx-kit. (dannyvv@microsoft.com)
- Port third-party-notice extraction logic to rnx-kit (dannyvv@microsoft.com)

### Patches

- Bump @rnx-kit/third-party-notices to v1.0.0 (dannyvv@microsoft.com)

## 0.4.4

Wed, 05 May 2021 21:00:14 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.2 (4123478+tido64@users.noreply.github.com)

## 0.4.3

Wed, 05 May 2021 20:55:03 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.1.1 (4123478+tido64@users.noreply.github.com)

## 0.4.2

Wed, 05 May 2021 19:51:01 GMT

### Patches

- Bump @rnx-kit/config to v0.2.6 (4123478+tido64@users.noreply.github.com)

## 0.4.1

Thu, 29 Apr 2021 13:47:02 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.0.3 (4123478+tido64@users.noreply.github.com)

## 0.4.0

Wed, 28 Apr 2021 17:08:34 GMT

### Minor changes

- Added `rnx-dep-check` command (4123478+tido64@users.noreply.github.com)

## 0.3.3

Wed, 28 Apr 2021 15:54:06 GMT

### Patches

- Bump @rnx-kit/config to v0.2.5 (4123478+tido64@users.noreply.github.com)

## 0.3.2

Tue, 27 Apr 2021 19:43:40 GMT

### Patches

- Bump @rnx-kit/config to v0.2.4 (4123478+tido64@users.noreply.github.com)

## 0.3.1

Tue, 27 Apr 2021 09:54:28 GMT

### Patches

- Bump @rnx-kit/config to v0.2.3 (4123478+tido64@users.noreply.github.com)

## 0.3.0

Fri, 16 Apr 2021 23:29:39 GMT

### Minor changes

- Removed `rnx-start` (4123478+tido64@users.noreply.github.com)

## 0.2.2

Fri, 09 Apr 2021 21:41:43 GMT

### Patches

- Remove default values that are no longer needed (4123478+tido64@users.noreply.github.com)

## 0.2.1

Fri, 09 Apr 2021 08:27:05 GMT

### Patches

- Exit with code if an error was encountered (4123478+tido64@users.noreply.github.com)

## 0.2.0

Thu, 11 Mar 2021 22:58:41 GMT

### Minor changes

- Add pass-through params to rnx-bundle, giving the caller control over all aspects of metro bundling. (afoxman@microsoft.com)

### Patches

- Bump @rnx-kit/config to v0.2.1 (afoxman@microsoft.com)

## 0.1.0

Wed, 10 Mar 2021 18:05:17 GMT

### Minor changes

- Change CLI args from camelCase to kebab-case. Add win32 as a platform. (afoxman@microsoft.com)

### Patches

- Bump @rnx-kit/config to v0.2.0 (afoxman@microsoft.com)

## 0.0.5

Mon, 08 Mar 2021 10:59:59 GMT

### Patches

- Manually bump version number to unblock publishing (4123478+tido64@users.noreply.github.com)

## 0.0.3

Mon, 22 Feb 2021 10:50:46 GMT

### Patches

- Add strictNullChecks and noImplicitAny to the shared tsconfig. Remove from metro-config. Fix code to meet more strict type checks. (afoxman@microsoft.com)

## 0.0.2

Fri, 19 Feb 2021 19:58:00 GMT

### Patches

- Create a CLI package which self-registers with @react-native-community/cli. Add bundling commands 'rnx-bundle' and 'rnx-start' which invoke metro. Move bundle code from build system to CLI package. (afoxman@microsoft.com)
