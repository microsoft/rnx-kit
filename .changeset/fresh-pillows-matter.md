---
"@rnx-kit/metro-serializer-esbuild": patch
---

Don't add namespace to all source files. esbuild currently adds it to all file paths in the source map (see https://github.com/evanw/esbuild/issues/2283). This prevents tools from resolving files correctly.
