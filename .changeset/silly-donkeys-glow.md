---
"@rnx-kit/metro-serializer-esbuild": patch
---

Metro does not inject `"use strict"`, but esbuild does. If we're targeting ES5, we should strip them out.
