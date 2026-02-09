---
"@rnx-kit/babel-preset-metro-react-native": patch
---

Disable `unstable_preserveClasses` because Hermes' class implementation is not
fully compliant and we cannot unconditionally enable it due to backwards
compatibility
