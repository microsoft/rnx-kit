# @rnx-kit/eslint-config

This is for internal use only.

`@rnx-kit/eslint-config` is a shareable ESLint config with recommended Prettier
and TypeScript rules.

For more details on shareable configs, see
https://eslint.org/docs/developer-guide/shareable-configs.

## Usage

Add `@rnx-kit/eslint-config` to your `package.json`:

```diff
diff --git a/~/package.json b/~/package.json
index d9daf8f..9ca1826 100644
--- a/~/package.json
+++ b/~/package.json
@@ -15,7 +15,8 @@
   },
   "scripts": {
     "build": "rnx-kit-scripts build",
     "format": "rnx-kit-scripts format",
+    "lint": "rnx-kit-scripts lint"
   },
   "dependencies": {
     "chalk": "^4.1.0",
@@ -37,6 +39,9 @@
     "@rnx-kit/scripts": "*",
     "typescript": "^4.0.0"
   },
+  "eslintConfig": {
+    "extends": "@rnx-kit/eslint-config"
+  },
   "jest": {
     "roots": [
       "test"
```
