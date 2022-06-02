---
"@rnx-kit/metro-config": none
---

## Breaking Changes

This version transitions from using our own internal bundling wrapper to the
official bundling API in `@react-native-community/cli-plugin-metro`, when it is
available.

Our wrapper is a little different than the official code, in that it does not
honor the `sourcemapUseAbsolutePath` flag. So this change also adds support for
that flag in our wrapper, making it fully compatible and interchangeable with
the official bundling API.

This is a breaking change because, when `sourcemapUseAbsolutePath` is `false`,
the `sourcemapOutput` is stripped of any path info, leaving only the name of the
source-map file.
