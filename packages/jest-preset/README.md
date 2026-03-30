# @rnx-kit/jest-preset

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/jest-preset)](https://www.npmjs.com/package/@rnx-kit/jest-preset)

A Jest preset with support for React Native
[platform-specific extensions](https://reactnative.dev/docs/platform-specific-code#platform-specific-extensions)
and [TypeScript](https://www.typescriptlang.org/).

## Usage

### In a TypeScript-only Package (Non-React Native)

Add `preset: "@rnx-kit/jest-preset"` to your Jest config:

```diff
 module.exports = {
+  preset: "@rnx-kit/jest-preset",
   ...
 };
```

`@rnx-kit/jest-preset` will detect that you're not targeting React Native and
exclude any React Native specific configurations.

### In a React Native Package

There are three ways to use this preset when targeting React Native, depending
on your personal preference.

#### Single `jest.config.js`

If you prefer to use a single Jest config, you can provide the target platform
via an environment variable. First, add `preset: "@rnx-kit/jest-preset"` to your
Jest config:

```diff
 module.exports = {
+  preset: "@rnx-kit/jest-preset",
   ...
 };
```

Then specify the target platform when running Jest:

```sh
RN_TARGET_PLATFORM=ios npm run jest
```

#### Multiple `jest.config.js`

Alternatively, you can have a Jest config file for each platform, e.g.:

```js
// jest.config.ios.js
module.exports = require("@rnx-kit/jest-preset")("ios", {
  ...
});
```

Then specify the config file to use when running Jest:

```sh
npm run jest --config jest.config.ios.js
```

#### Use `@rnx-kit/cli`

You can specify the target platform using the `rnx-test` command provided by
`@rnx-kit/cli`. First, add `preset: "@rnx-kit/jest-preset"` to your Jest config:

```diff
 module.exports = {
+  preset: "@rnx-kit/jest-preset",
   ...
 };
```

Then specify the target platform when running `rnx-test`:

```sh
npm run react-native rnx-test --platform ios
```

### In an Out-of-Tree Platform Package

Add `preset: "@rnx-kit/jest-preset"` to your Jest config:

```diff
 module.exports = {
+  preset: "@rnx-kit/jest-preset",
   ...
 };
```

The target platform will be deduced by reading `react-native.config.js` at the
package root.
