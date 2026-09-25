# @rnx-kit/types-kit-config

## 2.0.0

### Major Changes

- f35ba6b: Removed support for the legacy `dep-check` config schema

  `align-deps` no longer reads or migrates the legacy config keys
  `reactNativeVersion`, `reactNativeDevVersion`, `capabilities`, and
  `customProfiles`. Configuration must now be declared under `rnx-kit.alignDeps`.
  The `--migrate-config` flag has been removed along with
  `@rnx-kit/config`'s `getKitCapabilities()`.

  Packages still using the old schema now fail with a `legacy-configuration`
  error that points to the migration command below. To migrate them, run the last
  version that supported it:

  ```sh
  npx @rnx-kit/align-deps@^4 --migrate-config --write
  ```

## 1.0.1

### Patch Changes

- d2c22b2: Merged `ServerParameters` into `BundleParameters`
- Updated dependencies [d2c22b2]
  - @rnx-kit/types-bundle-config@1.0.1

## 1.0.0

### Major Changes

- 31e3bc8: Add dedicated types packages to fix circular dependencies in rnx-kit

### Patch Changes

- Updated dependencies [31e3bc8]
- Updated dependencies [dd2a9c6]
  - @rnx-kit/types-bundle-config@1.0.0
