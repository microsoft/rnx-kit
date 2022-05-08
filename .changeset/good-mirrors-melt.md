---
"@rnx-kit/docsite": patch
"@rnx-kit/cli": patch
"@rnx-kit/config": patch
"@rnx-kit/metro-serializer-esbuild": patch
"@rnx-kit/test-app": patch
---

Transition tree shaking from experimental to production. Deprecate experimental config/cmdline props, while still supporting them for this major version. They will be removed on the next major version bump.
