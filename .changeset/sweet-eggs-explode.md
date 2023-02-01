---
"@rnx-kit/metro-resolver-symlinks": patch
---

When `experimental_retryResolvingFromDisk` is enabled, don't parse exports maps as they currently take precedence over the `react-native` field.
