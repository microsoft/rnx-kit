---
"@rnx-kit/cli": none
---

# Breaking Changes

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
