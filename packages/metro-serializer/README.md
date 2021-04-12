# @rnx-kit/metro-serializer

`@rnx-kit/metro-serializer` is Metro's default JavaScript bundle serializer, but
with support for plugins.

## Usage

Import and set the serializer to `serializer.customSerializer` in your
`metro.config.js`, then add your desired plugins. For instance, to add
`CyclicDependencies` and `DuplicateDependencies` plugins:

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const {
  CyclicDependencies,
} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
const {
  DuplicateDependencies,
} = require("@rnx-kit/metro-plugin-duplicates-checker");
const { MetroSerializer } = require("@rnx-kit/metro-serializer");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  serializer: {
    customSerializer: MetroSerializer([
      CyclicDependencies(),
      DuplicateDependencies(),
    ]),
  },
});
```
