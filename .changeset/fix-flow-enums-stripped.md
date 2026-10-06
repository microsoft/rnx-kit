---
"@rnx-kit/babel-preset-metro-react-native": patch
---

Fixed Flow enums being stripped instead of transformed, which caused bundling
React Native 0.86+ with esbuild (`treeShake`) to fail with
`No matching export … for import "VirtualViewMode"`.

`@react-native/babel-preset` runs `@babel/plugin-transform-flow-strip-types`
before `babel-plugin-transform-flow-enums`. Because Babel classifies enum
declarations as Flow syntax, they were removed before they could be transformed.
The preset now runs `babel-plugin-transform-flow-enums` first. Without esbuild,
the build succeeded, but the affected enums were `undefined` at runtime.
