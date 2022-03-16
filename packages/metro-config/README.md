# @rnx-kit/metro-config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-config)](https://www.npmjs.com/package/@rnx-kit/metro-config)

`@rnx-kit/metro-config` provides helper functions for creating a Metro config
that works in a monorepo.

## Usage

First, we need to add two files to the target package, `babel.config.js` and
`metro.config.js`:

```js
// babel.config.js
module.exports = {
  presets: ["@rnx-kit/babel-preset-metro-react-native"],
};
```

```js
// metro.config.js
const { makeMetroConfig } = require("@rnx-kit/metro-config");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
});
```

To start the dev server:

```sh
yarn react-native start
```

To build the JS bundle:

```sh
yarn react-native bundle  \
  --entry-file <path>     \
  --platform <platform>   \
  --dev <false | true>    \
  --bundle-output <path>  \
  --assets-dest <path>

# e.g. to build a prod bundle
yarn react-native bundle             \
  --entry-file lib/index.ios.js      \
  --platform ios                     \
  --dev false                        \
  --bundle-output lib/main.jsbundle  \
  --assets-dest lib/
```

For more information on available commands and options, please see
[React Native CLI documentation](https://github.com/react-native-community/cli/blob/v4.13.1/docs/commands.md).

## Known Limitations

While Metro is the de-facto standard, it lacks a few features that would make it
optimal; here's our current wishlist, feel free to submit PRs if you want to
help with them :)

- Implement [symlinks](https://github.com/facebook/metro/issues/1)
  - Ideally this will be done directly upstream in Metro/Watchman. In the
    meantime, we are adding all the symlinks to `watchFolders` as a workaround.

### Bundle size

Metro currently does not implement tree shaking, i.e. it does not attempt to
remove unused code from the JS bundle. For instance, given this code snippet:

```ts
import { partition } from "lodash";
```

Metro will bundle all of `lodash` in your bundle even though you're only using a
small part of it. In `lodash`'s case, you can add
[`babel-plugin-lodash`](https://github.com/lodash/babel-plugin-lodash#readme) to
your Babel config to help Metro strip away some modules, but not all libraries
will come with such helpers.

If you're feeling adventurous, you can try an experimental Metro serializer
we've built that adds support for tree shaking:
[@rnx-kit/metro-serializer-esbuild](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer-esbuild#readme).
Do note that you will need to be on React Native 0.64 or above, and use Metro
0.66.1.

### Plugins

Metro doesn't have a plugin system, but it does have hooks that allows you to
implement something that functions similarly.
[@rnx-kit/metro-serializer](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer#readme)
implements a serializer that allows you to pass plugins that are run just before
the JS bundle is serialized and written to disk. Follow the
[instructions for installing it](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer#usage),
then try our plugins:

- [@rnx-kit/metro-plugin-cyclic-dependencies-detector](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-cyclic-dependencies-detector)
  is a plugin that detects cyclic imports. These can cause bugs that can be
  really confusing to debug.
- [@rnx-kit/metro-plugin-duplicates-checker](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-duplicates-checker)
  detects whether you're bundling multiple copies of the same package in your JS
  bundle.
- [@rnx-kit/metro-plugin-typescript-validation](https://github.com/microsoft/rnx-kit/tree/main/packages/metro-plugin-typescript-validation)
  performs type checking of the TypeScript files being bundled. The Babel plugin
  for TypeScript that comes with `metro-react-native-babel-preset` only strips
  the types. Normally, one would run `tsc` separately to ensure that the code is
  correct. This step can now be replaced with the plugin.

You can of course also provide your own plugins.

### Ensuring a single instance of a package

Normally, Metro resolves a module relative to the package it is currently
residing in. For example, with a monorepo such as below, `my-awesome-package`
would resolve `react-native-msal@2.0.3` while `another-awesome-package` would
resolve `react-native-msal@3.1.0`. This would lead to duplicate packages in your
bundle and may cause issues.

    workspace
    ├── node_modules
    │   └── react-native-msal@3.1.0  <-- should be ignored
    └── packages
        ├── my-awesome-package
        │   └── node_modules
        │       └── react-native-msal@2.0.3  <-- should take precedence
        └── another-awesome-package  <-- imported by my-awesome-package,
                                         but uses workspace's react-native-msal

If we simply exclude the workspace's copy, Metro will not be able to find
`react-native-msal` from `another-awesome-package`. It also won't exclude copies
that are installed in other packages. To help Metro resolve to the correct copy,
we need to exclude all other copies, and also add a corresponding entry in
`extraNodeModules`. `@rnx-kit/metro-config` contains functions to help you set
this up correctly. Given the example above, our `metro.config.js` should look
like this:

```js
const {
  exclusionList,
  makeMetroConfig,
  resolveUniqueModule,
} = require("@rnx-kit/metro-config");

const [msalPath, msalExcludePattern] = resolveUniqueModule("react-native-msal");
const additionalExclusions = [msalExcludePattern];
const blockList = exclusionList(additionalExclusions);

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  resolver: {
    extraNodeModules: {
      "react-native-msal": msalPath,
    },
    blacklistRE: blockList, // For Metro < 0.60
    blockList, // For Metro >= 0.60
  },
});
```

### Error: EMFILE: too many open files, watch

If you're getting an error like below, you need to
[install Watchman](https://facebook.github.io/watchman/docs/install.html).

```
events.js:292
      throw er; // Unhandled 'error' event
      ^

Error: EMFILE: too many open files, watch
    at FSEvent.FSWatcher._handle.onchange (internal/fs/watchers.js:178:28)
Emitted 'error' event on NodeWatcher instance at:
    at NodeWatcher.checkedEmitError (/~/node_modules/sane/src/node_watcher.js:143:12)
    at FSWatcher.emit (events.js:315:20)
    at FSEvent.FSWatcher._handle.onchange (internal/fs/watchers.js:184:12) {
  errno: -24,
  syscall: 'watch',
  code: 'EMFILE',
  filename: null
}
```

### Error: jest-haste-map: Haste module naming collision

Metro will throw an exception if it finds duplicates:

```
Error: jest-haste-map: Haste module naming collision:
  Duplicate module name: react-animated
  Paths: /~/node_modules/example/node_modules/react-native/Libraries/Animated/release/package.json collides with /~/node_modules/react-native/Libraries/Animated/release/package.json

This error is caused by `hasteImpl` returning the same name for different files.
    at setModule (/~/node_modules/jest-haste-map/build/index.js:569:17)
    at workerReply (/~/node_modules/jest-haste-map/build/index.js:641:9)
    at processTicksAndRejections (internal/process/task_queues.js:97:5)
    at async Promise.all (index 77)
```

To resolve this, you'll need to exclude one of the paths in your
`metro.config.js`, e.g.:

```js
const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");

const blockList = exclusionList([
  // Ignore nested copies of react-native
  /node_modules\/.*\/node_modules\/react-native\/.*/,
]);

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  resolver: {
    blacklistRE: blockList, // For Metro < 0.60
    blockList, // For Metro >= 0.60
  },
});
```

### [Flipper] React DevTools is disabled

Flipper only enables React Native plugins if it detects a Metro "device". It
detects one by opening `localhost:8081` and checking for some keywords like
"React Native packager is running". However, if one of your packages have an
`index.html` in the package root, Metro will serve that file instead. Flipper
will then think that it's not dealing with a React Native app and disable all
related plugins.

The fix is to move `index.html` elsewhere, but if you cannot do that, you can
work around this issue by filtering out the offending packages in
`metro.config.js`:

```js
const { makeMetroConfig } = require("@rnx-kit/metro-config");
const fs = require("fs");
const path = require("path");

const config = makeMetroConfig({ projectRoot: __dirname });

module.exports = {
  ...config,
  watchFolders: config.watchFolders.filter(
    (p) => !fs.existsSync(path.join(p, "index.html"))
  ),
};
```
