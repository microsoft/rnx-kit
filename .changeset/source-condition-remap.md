---
"@rnx-kit/babel-plugin-import-path-remapper": patch
---

Remap packages that explicitly declare a source entry via a condition on
their root export (e.g. `"exports": { ".": { "source": "./src/index.ts",
... } }`), opted into with the new `sourceExportCondition` option naming
the condition(s) to honor. Without the option, behavior is unchanged.
Packages with `exports` but no matching declaration are left alone as
before, but the `remap` callback is now consulted for them instead of
being skipped.
