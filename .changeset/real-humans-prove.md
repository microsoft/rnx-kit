---
"@rnx-kit/babel-preset-metro-react-native": patch
---

Disable `useTransformReactJSXExperimental` by default. While esbuild may be able to parse it, Metro/Babel will fail if no runtime is configured.
