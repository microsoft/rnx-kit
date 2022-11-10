---
"@rnx-kit/align-deps": major
---

`dep-check` has been renamed to `align-deps`

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
