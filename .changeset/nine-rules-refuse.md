---
"@rnx-kit/react-native-host": patch
---

Enable `concurrentRoot` by default when New Architecture is enabled.

Having `concurrentRoot` disabled when Fabric is enabled is not
recommended:
https://github.com/facebook/react-native/commit/7eaabfb174b14a30c30c7017195e8110348e5f44

As of 0.74, it won't be possible to opt-out:
https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03
