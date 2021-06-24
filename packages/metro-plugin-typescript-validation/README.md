# @rnx-kit/metro-plugin-typescript-validation

`@rnx-kit/metro-plugin-typescript-validation` checks TypeScript source files in
your package for syntactic and semantic correctness.

## Usage

Add this plugin in your `metro.config.js` using `@rnx-kit/metro-serializer`:

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  typescriptSerializerHook,
} = require("@rnx-kit/metro-plugin-typescript-validation");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  serializer: {
    experimentalSerializerHook: typescriptSerializerHook,
  },
});
```

This plugin runs as part of Metro bundling and bundle-serving. When a type error
occurs, it is displayed on the Metro console.
