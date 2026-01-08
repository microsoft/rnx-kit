---
"@rnx-kit/metro-config": patch
"@rnx-kit/metro-service": patch
---

Fixed assets outside of project root not rendering. This breaks release builds
so it must be manually enabled in `metro.config.js`:

```diff
diff --git a/metro.config.js b/metro.config.js
index 000000000..000000000 100644
--- a/metro.config.js
+++ b/metro.config.js
@@ -34,4 +34,5 @@ module.exports = makeMetroConfig({
     blacklistRE: blockList,
     blockList,
   },
+  unstable_allowAssetsOutsideProjectRoot: true,
 });
```
