<!--remove-block start-->

# @rnx-kit/react-native-lazy-index

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-lazy-index)](https://www.npmjs.com/package/@rnx-kit/react-native-lazy-index)

<!--remove-block end-->

`react-native-lazy-index` is a RAM bundle friendly, bundle-time generated
`index.js`. Improve your app startup time by only loading features you'll use on
demand.

For information on RAM bundles and inline requires, see
[React Native Performance](https://reactnative.dev/docs/ram-bundles-inline-requires).

If you use [Haul](https://github.com/callstack/haul), also take a look at their
[documentation](https://github.com/callstack/haul/blob/2c68e97766f9f6c2632c46e40631bd7aaacdc75b/docs/CLI%20Commands.md#haul-ram-bundle).

## Installation

```sh
npm install --save @rnx-kit/react-native-lazy-index
```

## Usage

`react-native-lazy-index` uses
[`babel-plugin-codegen`](https://github.com/kentcdodds/babel-plugin-codegen#configure-with-babel),
so you'll need to configure Babel to include it. The recommended way is to add
it to your `.babelrc`:

```diff
 {
   "presets": ["module:metro-react-native-babel-preset"],
   "plugins": [
+    "codegen"
   ]
 }
```

In your `package.json`, add a section called `"experiences"` with the features
that should be lazy loaded. In the example below, we've listed four packages:

```diff
 {
   "name": "my-awesome-app",
   "version": "1.0.0",
   "main": "index.js",
   "dependencies": {
     "@awesome-app/some-feature": "*",
     "@awesome-app/another-feature": "*",
     "@awesome-app/yet-another-feature": "*",
     "@awesome-app/final-feature": "*",
     "@rnx-kit/react-native-lazy-index": "^2.0.0",
     "react": "16.13.1",
     "react-native": "0.63.4"
   },
+  "experiences": [
+    "@awesome-app/some-feature",
+    "@awesome-app/another-feature",
+    "@awesome-app/yet-another-feature",
+    "@awesome-app/final-feature"
+  ]
 }
```

Finally, replace the content of your `index.js` with:

```js
import "@rnx-kit/react-native-lazy-index";
```

That's it!

## Why

With a naive `index.js`, all features will be loaded when your app starts and
React Native is initialized for the first time.

```js
import "@awesome-app/some-feature";
import "@awesome-app/another-feature";
import "@awesome-app/yet-another-feature";
import "@awesome-app/final-feature";
```

By loading features on demand, we can improve app startup time.

With `react-native-lazy-index`, we no longer load all features up front.
Instead, `index.js` wraps calls to `AppRegistry.registerComponent` and
`BatchedBridge.registerCallableModule`, deferring the import of a feature until
it is used. Features that are never used, are never loaded.

When you import `react-native-lazy-index`, something similar to below is
generated:

```js
const { AppRegistry } = require("react-native");
const BatchedBridge = require("react-native/Libraries/BatchedBridge/BatchedBridge");

AppRegistry.registerComponent("SomeFeature", () => {
  // We'll import the module the first time "SomeFeature" is accessed.
  require("@awesome-app/some-feature");
  // "SomeFeature" is now overwritten and we can return the real component.
  // Subsequent calls to "SomeFeature" will no longer go through this wrapper.
  return AppRegistry.getRunnable("SomeFeature").componentProvider();
});

BatchedBridge.registerLazyCallableModule("AnotherFeature", () => {
  // We'll import the module the first time "AnotherFeature" is accessed.
  require("@awesome-app/another-feature");
  // "AnotherFeature" is now overwritten and we can return the real component.
  // Subsequent calls to "AnotherFeature" will no longer go through this
  // wrapper.
  return BatchedBridge.getCallableModule("AnotherFeature");
});

AppRegistry.registerComponent("YetAnotherFeature", () => {
  // We'll import the module the first time "YetAnotherFeature" is accessed.
  require("@awesome-app/yet-another-feature");
  // "YetAnotherFeature" is now overwritten and we can return the real
  // component. Subsequent calls to "YetAnotherFeature" will no longer go
  // through this wrapper.
  return AppRegistry.getRunnable("YetAnotherFeature").componentProvider();
});

AppRegistry.registerComponent("FinalFeature", () => {
  // We'll import the module the first time "FinalFeature" is accessed.
  require("@awesome-app/final-feature");
  // "FinalFeature" is now overwritten and we can return the real component.
  // Subsequent calls to "FinalFeature" will no longer go through this wrapper.
  return AppRegistry.getRunnable("FinalFeature").componentProvider();
});
```

## Troubleshooting

If you're having trouble with undetected components, there are a couple of
things you should look out for.

### First parameter must be a string literal

`react-native-lazy-index` cannot evaluate the name passed to
`AppRegistry.registerComponent()` or `BatchedBridge.registerCallableModule()`
unless it is a string literal. For instance, if you have something like this in
code:

```js
const appName = "MyApp";

AppRegistry.registerComponent(appName, () => {
  ...
});
```

You'll need to inline the string:

```js
AppRegistry.registerComponent("MyApp", () => {
  ...
});
```

`react-native-lazy-index` outputs warnings when it detects these instances. If
changing the code is not feasible, you can also
[manually declare all entry points](#i-want-to-manually-declare-all-entry-points-myself).

### My components are still not found

`react-native-lazy-index` avoids scanning dependencies too deeply to reduce its
impact on the build time. If your registrations lie too deep within a
dependency, it may have bailed out before reaching them. There are a couple of
things you can do to help `react-native-lazy-index` find your components:

1. If you have access to the source code, you can move your registrations
   further up, closer to the entry point of your dependency.
2. You can increase the max depth by setting the environment variable
   `RN_LAZY_INDEX_MAX_DEPTH`. The default is currently set to 3. Note that
   changing this setting may significantly impact your build time.
3. If neither is feasible, you can also
   [manually declare all entry points](#i-want-to-manually-declare-all-entry-points-myself).

### I want to manually declare all entry points myself

You can skip scanning by manually declaring entry points. The below
configuration will generate the same code as the earlier example output:

```json
  "experiences": {
    "SomeFeature": "@awesome-app/some-feature",
    "callable:AnotherFeature": "@awesome-app/another-feature",
    "YetAnotherFeature": "@awesome-app/yet-another-feature",
    "FinalFeature": "@awesome-app/final-feature"
  }
```

By default, a call to `AppRegistry` is generated using the key as the app key,
and the value is the name of the module containing the app. If the key is
prefixed with `callable:`, a call to `BatchedBridge` will be generated.

## Contributing

This project welcomes contributions and suggestions. Most contributions require
you to agree to a Contributor License Agreement (CLA) declaring that you have
the right to, and actually do, grant us the rights to use your contribution. For
details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.
