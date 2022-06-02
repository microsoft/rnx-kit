---
"@rnx-kit/metro-resolver-symlinks": patch
---

Metro enters a different code path than it should have when `resolveRequest` is set and the target package uses the `browser` field to redirect modules. If detected, we need to unset `resolveRequest` and retry with Metro's resolver to avoid interference.
