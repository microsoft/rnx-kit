---
"@rnx-kit/react-native-host": patch
---

Added support for Bridgeless Mode

Bridgeless mode can now be enabled by setting the environment variable
`USE_BRIDGELESS=1`. This build flag will enable bridgeless bits, but you can
still disable it at runtime by implementing `RNXHostConfig.isBridgelessEnabled`.

See the full announcement here:
https://reactnative.dev/blog/2023/12/06/0.73-debugging-improvements-stable-symlinks#new-architecture-updates
