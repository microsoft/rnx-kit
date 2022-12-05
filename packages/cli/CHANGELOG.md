# Change Log - @rnx-kit/cli

## 0.15.2

### Patch Changes

- 2f0c782e: Extract TypeScript plugin to a separate package
- Updated dependencies [2f0c782e]
  - @rnx-kit/metro-plugin-typescript@0.1.0

## 0.15.1

### Patch Changes

- Updated dependencies [94aeb460]
  - @rnx-kit/typescript-react-native-resolver@0.3.0

## 0.15.0

### Minor Changes

- d563e22f: Migrate from `@rnx-kit/dep-check` to `@rnx-kit/align-deps`

## 0.14.10

### Patch Changes

- 80f823df: Fail gracefully if `jest-cli` is not installed (part 2)
- Updated dependencies [c14e998e]
- Updated dependencies [a5810bb8]
  - @rnx-kit/dep-check@1.13.5
  - @rnx-kit/tools-language@1.4.1

## 0.14.9

### Patch Changes

- 496a6f4a: Add `keysOf` to `@rnx-kit/tools-language`, a type-safe wrapper around `Object.keys`
- Updated dependencies [34b83032]
- Updated dependencies [bdeda331]
- Updated dependencies [496a6f4a]
  - @rnx-kit/dep-check@1.13.4
  - @rnx-kit/tools-language@1.4.0

## 0.14.8

### Patch Changes

- 659a4423: Fail gracefully if `jest-cli` is not installed

## 0.14.7

### Patch Changes

- 6d48c95c: Fix Windows compatability and a minor security issue.

## 0.14.6

### Patch Changes

- 94c95d81: Fixed CLI not parsing numbers correctly

## 0.14.5

### Patch Changes

- d7150595: Add support for "Random Access Module" bundle format
- Updated dependencies [d7150595]
  - @rnx-kit/config@0.5.2
  - @rnx-kit/metro-service@3.0.2

## 0.14.4

### Patch Changes

- Updated dependencies [32480303]
  - @rnx-kit/metro-plugin-duplicates-checker@2.0.0

## 0.14.3

### Patch Changes

- c067c1be: Allow specifying multiple packages on command line

## 0.14.2

### Patch Changes

- Updated dependencies [93dda3ab]
  - @rnx-kit/metro-service@3.0.0

## 0.14.1

### Patch Changes

- 80333120: Fixed tree shaking not being enabled unless `--tree-shake` is specified

## 0.14.0

### Minor Changes

- e2535866: # Breaking Changes

  ## Command-Line: align parameter names with @react-native-community/cli

  Add, rename, and remove command-line parameters in @rnx-kit/cli to fully align
  with the well-known names used in @react-native-community/cli. This change will
  pairs with similar changes in @rnx-kit/config.

  In doing this, we'll be making it easier for developers to migrate to using our
  config/cli combination, and our cli will become a "drop in" replacement
  @react-native-community/cli. The longer-term goal is to upstream our work into
  the community CLI, but until it is proven and accepted, we will continue to
  maintain our wrapper commands.

  ### `rnx-bundle` parameteters

  Add:

  - --bundle-output
  - --sourcemap-use-absolute-path
  - --unstable-transform-profile

  Remove:

  - --bundle-prefix
  - --dist-path

  Rename:

  - --entry-path -> --entry-file
  - --assets-path -> --assets-dest

  ### `rnx-start` parameters

  Rename:

  - --project-root -> --projectRoot
  - --watch-folders -> --watchFolders
  - --asset-plugins -> --assetPlugins
  - --source-exts -> --sourceExts

  ## Zero configuration required

  The bundler and bundle-server no longer require rnx-kit configuration to run.
  This makes it possible to "upgrade" to @rnx-kit/cli by only changing the command
  name:

  - `react-native bundle` -> `react-native rnx-bundle`
  - `react-native start` -> `react-native rnx-start`

  ## Default configuration

  This release moves configuration defaults from @rnx-kit/config to the CLI. The
  CLI expresses our opinionated view of how config should be interpreted.

  The following defaults now apply when running `rnx-bundle` and `rnx-start`:

  - --entry-file / entryFile: "index.js"
  - --bundle-output / bundleOutput: "index.<`platform`>.bundle" (Windows,
    Android), or "index.<`platform`>.jsbundle" (iOS, MacOS)
  - detectCyclicDependencies: `true` (config only)
  - detectDuplicateDependencies: `true` (config only)
  - typescriptValidation: `true` (config only)
  - --tree-shake / treeShake: `false`
  - --sourcemap-use-absolute-path / sourcemapUseAbsolutePath: `false` (bundling
    only)

  **NOTE**: Defaults are only used when the corresponding fields are missing from
  both configuration and the command-line.

  In addition to these defaults, `rnx-start` will use `bundle` configuration when
  `server` configuration is not present, ensuring that by default, you are serving
  the same way you are bundling. If both both are missing, then the above baseline
  defaults are used.

  ## `rnx-bundle`: source-map changes

  The bundling code used to force the creation of a source-map file when in dev
  mode (--dev true). This is inconsistent with how @react-native-community/cli
  works, so it has been removed.

  Further, `rnx-bundle` now supports `--sourcemap-use-absolute-path` with a
  default value of `false`. This aligns with the @react-native-community/cli
  behavior, and is a breaking change because it causes `sourcemapOutput` to be
  stripped of any path info, leaving only the name of the source-map file.

  ## Drop support for deprecated `rnx-bundle` parameter --experimental-tree-shake

  This parameters was marked deprecated in a previous release, and though it was
  still supported, it emitted a warning when used.

  All support has now been dropped. The replacement parameter is `--tree-shake`.

### Patch Changes

- Updated dependencies [e2535866]
- Updated dependencies [e2535866]
  - @rnx-kit/metro-service@2.0.0
  - @rnx-kit/config@0.5.0

## 0.12.7

### Patch Changes

- 569a099: Bump @rnx-kit/tools-node to v1.2.7

## 0.12.6

### Patch Changes

- f5d91ef: rnx-copy-assets: exit if encountering an error

## 0.12.5

### Patch Changes

- 20e4518: When doing typescript validation during bundling, ignore non-TS projects rather than failing.

## 0.12.4

### Patch Changes

- b864d94: Add support for `@react-native-community/cli` 7.0.3

## 0.12.3

### Patch Changes

- 9921b7a: test: don't require `package.json` directly as it may not be exported
- 9921b7a: copy-assets: Allow assembling arbitrary modules

## 0.12.2

### Patch Changes

- e352f4c: Transition tree shaking from experimental to production. Deprecate experimental config/cmdline props, while still supporting them for this major version. They will be removed on the next major version bump. Update documentation and tests.
- 32eab87: Avoid `fs/promises` to be compatible with Node 12

## 0.12.1

### Patch Changes

- d3e2877: Fix `copy-assets` failing to resolve dependencies

## 0.12.0

### Minor Changes

- d9e63f0: Add a command, `rnx-copy-assets`, to copy assets that are not referenced from JS. Usually, Metro copies imported assets for you, but sometimes you need additional files if they are only accessed from native modules.

### Patch Changes

- Updated dependencies [d9e63f0]
  - @rnx-kit/tools-language@1.3.0

## 0.11.2

### Patch Changes

- b1dfbe3: `rnx-clean` has been upstreamed to `@react-native-community/cli`. Print a warning if `cli-clean` can be found.

## 0.11.1

### Patch Changes

- a1f0417: `rnx-clean`: Make cache integrity verification optional

## 0.11.0

### Minor Changes

- 2036ac7: Added Generic rnxClean script.This is responsible for clearing all react native related caches.

### Patch Changes

- 6f659dd: Fix `rnx-clean` not clearing Gradle cache on Windows
- 6f659dd: Use `os.tmpdir()` instead of relying on an environment variable
- 6f659dd: Integrate `ora` to make the output of `rnx-clean` prettier
- 6f659dd: `pod cache clean` only needs to be run once
- c15102f: Fix "watchman::CommandValidationError: failed to validate command: unknown command watchman-del-all" when running `rnx-clean`
- Updated dependencies [f385a26]
- Updated dependencies [868be32]
- Updated dependencies [d10f4b0]
  - @rnx-kit/dep-check@1.12.0

## 0.10.0

### Minor Changes

- fa7ef12: Added command to show QR code. This QR code can be scanned in React Native Test App to load the bundle from the dev server, eliminating the need to manually configure the bundler address.

### Patch Changes

- Updated dependencies [a50e4a3]
- Updated dependencies [adf6feb]
  - @rnx-kit/metro-serializer-esbuild@0.1.0
  - @rnx-kit/tools-react-native@1.2.0

## 0.9.58

### Patch Changes

- Updated dependencies [28f632a]
  - @rnx-kit/typescript-react-native-resolver@0.2.0

## 0.9.57

### Patch Changes

- bea8385: Keep .d.ts files in the list when opening a TypeScript project.

## 0.9.56

### Patch Changes

- 51bc530: Scope Metro type-checking to files that TypeScript views as source code (ignore transpiled files).

## 0.9.55

### Patch Changes

- d4c21eb: Update the CLI to support type-checking across many projects in a monorepo. Further, when bundling, fail on type errors. On serving, print type errors but continue without failure.

## 0.9.54

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/config to v0.4.21
- Bump @rnx-kit/console to v1.0.11
- Bump @rnx-kit/dep-check to v1.9.5
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.21
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.15
- Bump @rnx-kit/metro-serializer to v1.0.11
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.23
- Bump @rnx-kit/metro-service to v1.1.13
- Bump @rnx-kit/third-party-notices to v1.2.13
- Bump @rnx-kit/tools-language to v1.2.6
- Bump @rnx-kit/tools-node to v1.2.6
- Bump @rnx-kit/tools-react-native to v1.0.10
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.3
- Bump @rnx-kit/typescript-service to v1.5.3

## 0.9.53

Fri, 19 Nov 2021 16:08:47 GMT

### Patches

- Bump @rnx-kit/typescript-react-native-resolver to v0.1.2
- Bump @rnx-kit/typescript-service to v1.5.2

## 0.9.52

Thu, 18 Nov 2021 20:51:04 GMT

### Patches

- Bump @rnx-kit/config to v0.4.20
- Bump @rnx-kit/console to v1.0.10
- Bump @rnx-kit/dep-check to v1.9.4
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.20
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.14
- Bump @rnx-kit/metro-serializer to v1.0.10
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.22
- Bump @rnx-kit/metro-service to v1.1.12
- Bump @rnx-kit/third-party-notices to v1.2.12
- Bump @rnx-kit/tools-language to v1.2.5
- Bump @rnx-kit/tools-node to v1.2.5
- Bump @rnx-kit/tools-react-native to v1.0.9
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.1
- Bump @rnx-kit/typescript-service to v1.5.1

## 0.9.51

Tue, 16 Nov 2021 14:33:15 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.9.3

## 0.9.50

Mon, 15 Nov 2021 12:33:07 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.9.2

## 0.9.49

Fri, 12 Nov 2021 13:04:39 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.9.1

## 0.9.48

Thu, 11 Nov 2021 17:49:21 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.9.0

## 0.9.47

Tue, 09 Nov 2021 21:11:31 GMT

### Patches

- Update the CLI's Metro/TS integration to use the new, generalized resolver in @rnx-kit/typescript-react-native-resolver. Remove the unneeded "default" resolver. (afoxman@microsoft.com)
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.0
- Bump @rnx-kit/typescript-service to v1.5.0

## 0.9.46

Mon, 08 Nov 2021 10:20:15 GMT

### Patches

- Default value for `projectRoot` overrides value in Metro config (4123478+tido64@users.noreply.github.com)
- Bump @rnx-kit/config to v0.4.19
- Bump @rnx-kit/dep-check to v1.8.18

## 0.9.45

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/config to v0.4.18
- Bump @rnx-kit/console to v1.0.9
- Bump @rnx-kit/dep-check to v1.8.17
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.19
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.13
- Bump @rnx-kit/metro-serializer to v1.0.9
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.21
- Bump @rnx-kit/metro-service to v1.1.11
- Bump @rnx-kit/third-party-notices to v1.2.11
- Bump @rnx-kit/tools-language to v1.2.4
- Bump @rnx-kit/tools-node to v1.2.4
- Bump @rnx-kit/tools-react-native to v1.0.8
- Bump @rnx-kit/typescript-service to v1.4.3

## 0.9.44

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Bump @rnx-kit/config to v0.4.17
- Bump @rnx-kit/console to v1.0.8
- Bump @rnx-kit/dep-check to v1.8.16
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.18
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.12
- Bump @rnx-kit/metro-serializer to v1.0.8
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.20
- Bump @rnx-kit/metro-service to v1.1.10
- Bump @rnx-kit/third-party-notices to v1.2.10
- Bump @rnx-kit/tools-language to v1.2.3
- Bump @rnx-kit/tools-node to v1.2.3
- Bump @rnx-kit/tools-react-native to v1.0.7
- Bump @rnx-kit/typescript-service to v1.4.2

## 0.9.43

Wed, 03 Nov 2021 18:15:39 GMT

### Patches

- Bump @rnx-kit/config to v0.4.16
- Bump @rnx-kit/console to v1.0.7
- Bump @rnx-kit/dep-check to v1.8.15
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.17
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.11
- Bump @rnx-kit/metro-serializer to v1.0.7
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.19
- Bump @rnx-kit/metro-service to v1.1.9
- Bump @rnx-kit/third-party-notices to v1.2.9
- Bump @rnx-kit/tools-language to v1.2.2
- Bump @rnx-kit/tools-node to v1.2.2
- Bump @rnx-kit/tools-react-native to v1.0.6
- Bump @rnx-kit/typescript-service to v1.4.1

## 0.9.42

Mon, 01 Nov 2021 15:07:43 GMT

### Patches

- Update the CLI, adjusting it to use the new typescript-service package. (afoxman@microsoft.com)
- Bump @rnx-kit/typescript-service to v1.4.0

## 0.9.41

Mon, 01 Nov 2021 13:46:12 GMT

### Patches

- Normalize main and types fields across all packages which use them. (afoxman@microsoft.com)
- Bump @rnx-kit/config to v0.4.15
- Bump @rnx-kit/console to v1.0.6
- Bump @rnx-kit/dep-check to v1.8.14
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.16
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.10
- Bump @rnx-kit/metro-serializer to v1.0.6
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.18
- Bump @rnx-kit/metro-service to v1.1.8
- Bump @rnx-kit/third-party-notices to v1.2.8
- Bump @rnx-kit/tools-language to v1.2.1
- Bump @rnx-kit/tools-node to v1.2.1
- Bump @rnx-kit/tools-react-native to v1.0.5
- Bump @rnx-kit/typescript-service to v1.3.10

## 0.9.40

Sat, 30 Oct 2021 07:50:51 GMT

### Patches

- Bump @rnx-kit/config to v0.4.14
- Bump @rnx-kit/dep-check to v1.8.13
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.15
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.9
- Bump @rnx-kit/metro-service to v1.1.7
- Bump @rnx-kit/third-party-notices to v1.2.7
- Bump @rnx-kit/tools-language to v1.2.0
- Bump @rnx-kit/tools-node to v1.2.0
- Bump @rnx-kit/typescript-service to v1.3.9

## 0.9.39

Fri, 29 Oct 2021 14:13:32 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.8.12

## 0.9.38

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Bump @rnx-kit/config to v0.4.13
- Bump @rnx-kit/console to v1.0.5
- Bump @rnx-kit/dep-check to v1.8.11
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.14
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.8
- Bump @rnx-kit/metro-serializer to v1.0.5
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.17
- Bump @rnx-kit/metro-service to v1.1.6
- Bump @rnx-kit/third-party-notices to v1.2.6
- Bump @rnx-kit/tools-language to v1.1.4
- Bump @rnx-kit/tools-node to v1.1.6
- Bump @rnx-kit/tools-react-native to v1.0.4
- Bump @rnx-kit/typescript-service to v1.3.8

## 0.9.37

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Bump @rnx-kit/config to v0.4.12
- Bump @rnx-kit/console to v1.0.4
- Bump @rnx-kit/dep-check to v1.8.10
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.13
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.7
- Bump @rnx-kit/metro-serializer to v1.0.4
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.16
- Bump @rnx-kit/metro-service to v1.1.5
- Bump @rnx-kit/third-party-notices to v1.2.5
- Bump @rnx-kit/tools-language to v1.1.3
- Bump @rnx-kit/tools-node to v1.1.5
- Bump @rnx-kit/tools-react-native to v1.0.3
- Bump @rnx-kit/typescript-service to v1.3.7

## 0.9.36

Fri, 29 Oct 2021 08:51:30 GMT

### Patches

- Bump @rnx-kit/config to v0.4.11
- Bump @rnx-kit/console to v1.0.3
- Bump @rnx-kit/dep-check to v1.8.9
- Bump @rnx-kit/metro-plugin-cyclic-dependencies-detector to v1.0.12
- Bump @rnx-kit/metro-plugin-duplicates-checker to v1.2.6
- Bump @rnx-kit/metro-serializer to v1.0.3
- Bump @rnx-kit/metro-serializer-esbuild to v0.0.15
- Bump @rnx-kit/metro-service to v1.1.4
- Bump @rnx-kit/third-party-notices to v1.2.4
- Bump @rnx-kit/tools-language to v1.1.2
- Bump @rnx-kit/tools-node to v1.1.4
- Bump @rnx-kit/tools-react-native to v1.0.2
- Bump @rnx-kit/typescript-service to v1.3.6

## 0.9.35

Tue, 26 Oct 2021 17:22:16 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.8.8

## 0.9.34

Thu, 14 Oct 2021 07:54:03 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.8.7

## 0.9.33

Wed, 29 Sep 2021 11:02:41 GMT

### Patches

- Bump @rnx-kit/config to v0.4.10
- Bump @rnx-kit/dep-check to v1.8.6

## 0.9.32

Wed, 29 Sep 2021 09:09:11 GMT

### Patches

- Bump @rnx-kit/dep-check to v1.8.5

## 0.9.31

Mon, 27 Sep 2021 12:28:41 GMT

### Patches

- Bump @rnx-kit/config to v0.4.9
- Bump @rnx-kit/dep-check to v1.8.4

## 0.9.30

Mon, 27 Sep 2021 10:56:47 GMT

### Patches

- Bump @rnx-kit/config to v0.4.8
- Bump @rnx-kit/dep-check to v1.8.3

## 0.9.29

Tue, 14 Sep 2021 15:28:16 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.29 (4123478+tido64@users.noreply.github.com)

## 0.9.28

Mon, 13 Sep 2021 18:43:23 GMT

### Patches

- Fix plugins cannot be disabled when bundling/serving (4123478+tido64@users.noreply.github.com)

## 0.9.27

Mon, 13 Sep 2021 17:38:26 GMT

### Patches

- Bump @rnx-kit/cli to v0.9.27 (4123478+tido64@users.noreply.github.com)

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
