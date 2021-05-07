# @rnx-kit/metro-plugin-typescript-validation

`@rnx-kit/metro-plugin-typescript-validation` checks TypeScript source files in your package for syntactic and semantic correctness.

## Usage

Add this plugin in your `metro.config.js` using `@rnx-kit/metro-serializer`:

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  TypeScriptValidation,
} = require("@rnx-kit/metro-plugin-typescript-validation");
const { MetroSerializer } = require("@rnx-kit/metro-serializer");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  serializer: {
    customSerializer: MetroSerializer([TypeScriptValidation()]),
  },
});
```

This plugin runs as part of Metro bundling. When a type error occurs, it is displayed console output and bundle creation fails (no files are written).
