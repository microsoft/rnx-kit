---
"@rnx-kit/metro-service": patch
---

`@react-native-community/cli-plugin-metro` has been deprecated. Sync to the
latest changes and don't depend on it for bundling.

`@react-native-community/cli-plugin-metro` is being moved into the
`react-native` repository. In the process, it was renamed and its API surface
has been reduced to the bare minimum. `buildBundleWithConfig`, which we need to
pass our custom config to the bundler, has also been axed. For more details, see
https://github.com/facebook/react-native/pull/38795.
