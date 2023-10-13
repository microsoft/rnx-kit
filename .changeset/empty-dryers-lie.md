---
"@rnx-kit/cli": patch
"@rnx-kit/metro-config": patch
"@rnx-kit/metro-resolver-symlinks": patch
"@rnx-kit/metro-serializer-esbuild": patch
"@rnx-kit/metro-serializer": patch
"@rnx-kit/metro-service": patch
"@rnx-kit/tools-react-native": patch
---

Ensure correct Metro dependencies are used by traversing the dependency chain starting from `react-native`
