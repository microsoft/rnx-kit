---
"@rnx-kit/align-deps": major
"@rnx-kit/config": major
"@rnx-kit/types-kit-config": major
---

Removed support for the legacy `dep-check` config schema

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
