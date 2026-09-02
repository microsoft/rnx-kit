---
"@rnx-kit/align-deps": minor
---

`align-deps` now removes stale/renamed dependencies when aligning a package. A stale package is only removed when the capability that supersedes it is actually being managed e.g., the `@react-native-community/async-storage` package is only removed when the `storage` capability is declared. Packages that `align-deps` doesn't manage are never touched.
