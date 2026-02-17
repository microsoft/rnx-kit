---
"@rnx-kit/eslint-plugin": patch
---

Added rule for types only modules. Enable it like below:

```js
{
  files: ["**/types.ts"],
  rules: {
    "@rnx-kit/type-definitions-only": "error",
  },
}
```
