---
"@rnx-kit/metro-config": patch
---

Remove `module` from `resolverMainFields` as Metro currently does not support it and causes confusion when bundling fails.
