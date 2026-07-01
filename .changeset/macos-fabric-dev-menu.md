---
"@rnx-kit/react-native-host": patch
---

Wire up the dev menu on macOS Fabric root views so secondary-click shows it. On react-native-macos 0.81+, this sets the new `RCTSurfaceHostingView.devMenu` property so upstream's `menuForEvent:` fires. On older versions, it installs a secondary-click gesture recognizer that pops up the dev menu directly. Without this, consumers of `host.viewWithModuleName:` lose the dev menu on the new architecture because they bypass `RCTRootViewFactory`, which is where upstream does the wiring.
