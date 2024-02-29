---
"@rnx-kit/react-native-host": patch
---

Implemented an `RCTHost` compatibility layer for deprecated methods, `-getModuleRegistry` and `-getSurfacePresenter`, and their replacements, `-moduleRegistry` and `-surfacePresenter` (see https://github.com/facebook/react-native/commit/c3b0a8f1626939cf5c7b3864a5acf9d3dad26fb3 for details)
