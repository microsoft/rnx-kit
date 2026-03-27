---
"@rnx-kit/babel-plugin-import-path-remapper": patch
---

Fix lib/ → src/ remapping for packages with an `exports` field in package.json. Previously, packages declaring `exports` were skipped entirely, causing bundlers to load pre-built files instead of source during development.
