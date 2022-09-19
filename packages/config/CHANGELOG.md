# Change Log - @rnx-kit/config

## 0.5.2

### Patch Changes

- d7150595: Add support for "Random Access Module" bundle format

## 0.5.1

### Patch Changes

- 80333120: Updated config schema to reflect breaking changes in 0.5

## 0.5.0

### Minor Changes

- e2535866: # Breaking Changes

  ## Schema: align property names with @react-native-community/cli

  Add, rename, and remove properties in @rnx-kit/config to fully align with the
  well-known names used in @react-native-community/cli. This change will ripple
  outward to @rnx-kit/cli as well.

  In doing this, we'll be making it easier for developers to migrate to using our
  config/cli combination, and our cli will become a "drop in" replacement
  @react-native-community/cli. The longer-term goal is to upstream our work into
  the community CLI, but until it is proven and accepted, we will continue to
  maintain our wrapper commands.

  To assist with this change, we detect the use of _old_ property names, and
  report detailed failure messages. This will highlight app config that needs to
  be updated (which seems better than silently ignoring it).

  Add:

  - bundleOutput
  - sourcemapUseAbsolutePath

  Remove:

  - bundlePrefix
  - distPath

  Rename:

  - entryPath -> entryFile
  - sourceMapPath -> sourcemapOutput
  - sourceMapSourcesRootPath -> sourcemapSourcesRoot
  - assetsPath -> assetsDest

  ## getKitConfig(): only search for rnx-kit configuration in package.json

  We no longer search for config in places like rnx-kit.config.js (e.g. no more
  `cosmiconfig`).

  **Why this change?** In all the places we use rnx-kit internally, no one is
  using this mechanism. Further, in external forums, there have been general
  complaints from JS devs about having too many config files -- package.json is
  the preferred "single source". In light of this, it didn't seem worthwhile to
  continue carrying `comsmiconfig` as a dependency.

  ## getBundleDefinition() -> getBundleConfig()

  Now takes rnx-kit configuration as input, and outputs a bundle configuration
  (which has changed in this release).

  No longer provides default values. Returns only what is in configuration.
  Defaults have moved into the CLI, which is our opinionated view of how config
  should be interpreted.

  Drops support for a previously deprecated property `experimental_treeShake`,
  which has since been replaced with `treeShake`.

  ## getBundlePlatformDefinition() -> getPlatformBundleConfig()

  Now requires a bundle configuration as input, and outputs a platform-specific
  bundle configuration.

  No longer provides default values. Returns only what is in configuration.
  Defaults have moved into the CLI, which is our opinionated view of how config
  should be interpreted.

  ## getServerConfig()

  No longer provides default values. Returns only what is in configuration.
  Defaults have moved into the CLI, which is our opinionated view of how config
  should be interpreted.

  # Non-breaking Changes

  ## Add fine-grained control for typescriptValidation

  Give developers fine-grained control over how TypeScript validation behaves.

## 0.4.24

### Patch Changes

- e352f4c: Transition tree shaking from experimental to production. Deprecate experimental config/cmdline props, while still supporting them for this major version. They will be removed on the next major version bump. Update documentation and tests.

## 0.4.23

### Patch Changes

- e81d50d: Update READMEs. Remove dead configuration types.

## 0.4.22

### Patch Changes

- e0b078e: Added a JSON schema for the config

## 0.4.21

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/console to v1.0.11

## 0.4.20

Thu, 18 Nov 2021 20:51:04 GMT

### Patches

- Bump @rnx-kit/console to v1.0.10

## 0.4.19

Mon, 08 Nov 2021 10:20:15 GMT

### Patches

- Default value for `projectRoot` overrides value in Metro config (4123478+tido64@users.noreply.github.com)

## 0.4.18

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/console to v1.0.9

## 0.4.17

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Bump @rnx-kit/console to v1.0.8

## 0.4.16

Wed, 03 Nov 2021 18:15:39 GMT

### Patches

- Bump @rnx-kit/console to v1.0.7

## 0.4.15

Mon, 01 Nov 2021 13:46:12 GMT

### Patches

- Normalize main and types fields across all packages which use them. (afoxman@microsoft.com)
- Bump @rnx-kit/console to v1.0.6

## 0.4.13

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Bump @rnx-kit/console to v1.0.5

## 0.4.12

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Bump @rnx-kit/console to v1.0.4

## 0.4.11

Fri, 29 Oct 2021 08:51:30 GMT

### Patches

- Bump @rnx-kit/console to v1.0.3

## 0.4.10

Wed, 29 Sep 2021 11:02:41 GMT

### Patches

- add jest, add meta for core testing, stabilize core with react capability (lsciandra@microsoft.com)

## 0.4.9

Mon, 27 Sep 2021 12:28:41 GMT

### Patches

- Add react dom and test renderer to capabilities (lsciandra@microsoft.com)

## 0.4.8

Mon, 27 Sep 2021 10:56:47 GMT

### Patches

- Add metro babel preset to capabilities (lsciandra@microsoft.com)

## 0.4.7

Fri, 03 Sep 2021 12:18:30 GMT

### Patches

- Bump @rnx-kit/config to v0.4.7 (4123478+tido64@users.noreply.github.com)

## 0.4.6

Tue, 31 Aug 2021 10:50:41 GMT

### Patches

- Warn when `reactNativeDevVersion` is set and `kitType` is `app` (4123478+tido64@users.noreply.github.com)

## 0.4.5

Tue, 31 Aug 2021 06:43:13 GMT

### Patches

- Bump @rnx-kit/config to v0.4.5 (4123478+tido64@users.noreply.github.com)

## 0.4.4

Fri, 27 Aug 2021 18:41:43 GMT

### Patches

- Bump @rnx-kit/config to v0.4.4 (4123478+tido64@users.noreply.github.com)

## 0.4.3

Wed, 25 Aug 2021 08:52:48 GMT

### Patches

- Bump @rnx-kit/config to v0.4.3 (afoxman@microsoft.com)

## 0.4.2

Wed, 25 Aug 2021 07:32:57 GMT

### Patches

- Bump @rnx-kit/config to v0.4.2 (afoxman@microsoft.com)

## 0.4.1

Sat, 21 Aug 2021 08:22:48 GMT

### Patches

- Integrate tools package and other common libraries throughout monorepo, removing custom code. (afoxman@microsoft.com)
- Bump @rnx-kit/config to v0.4.1 (afoxman@microsoft.com)

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
