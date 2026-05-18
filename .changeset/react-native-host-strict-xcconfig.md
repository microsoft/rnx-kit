---
"@rnx-kit/react-native-host": patch
---

fix(react-native-host): Various build fixes

- Rename inner `strongSelf` in `-setBridge:` to `innerStrongSelf` so it
  no longer shadows the outer.
- Gate `#import <React/RCTCxxBridgeDelegate.h>` behind `#if !USE_BRIDGELESS`
  to match the already-conditional protocol conformance.
- Drop the stray `;` before the `-viewWithModuleName:initialProperties:`
  body.
