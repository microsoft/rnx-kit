---
"@rnx-kit/react-native-host": patch
---

Fixed community JSC support.

Fix compile error in `ReactNativeHost.mm` when Hermes is not being used.
`fatal error: 'ReactCommon/RCTHermesInstance.h' file not found`

The `USE_HERMES` preprocessor definition was only being set in
`GCC_PREPROCESSOR_DEFINITIONS` (for C and Objective-C files), but NOT in
`CPP_PREPROCESSOR_DEFINITIONS` (for [Objective] C++) files. This caused
`ReactNativeHost.mm` to NOT receive the `USE_HERMES=0` flag, making it
incorrectly import Hermes symbols that aren't resolved at link time.
