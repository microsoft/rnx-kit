---
"@rnx-kit/metro-serializer-esbuild": patch
---

Do not lower template literals. Template literals are partially supported by
Hermes for most of the use cases we care about (e.g., `styled-components`).
