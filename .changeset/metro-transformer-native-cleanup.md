---
"@rnx-kit/metro-transformer-native": patch
---

Tighten the `codegenNativeComponent` detection regex (word-boundary + call/generic-arg follow-on) to eliminate false positives on comments and unrelated identifiers, add edge-case test coverage (empty files, syntax errors, Flow-typed JS), introduce a test-only `__testOnlyGetLastContext` probe for verifying derived context flags, and document installation, options, escape valves, and `metro-serializer-esbuild` interop in the README.
