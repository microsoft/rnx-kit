# @rnx-kit/metro-config

`@rnx-kit/metro-config` provides helper functions for creating a Metro config
that works in a monorepo.

## Usage

First, we need to add two files to the target package, `babel.config.js` and
`metro.config.js`:

```js
// babel.config.js
const { makeBabelConfig } = require("@rnx-kit/metro-config");
module.exports = makeBabelConfig();
```

```js
// metro.config.js
const { makeMetroConfig } = require("@rnx-kit/metro-config");

module.exports = makeMetroConfig({
  projectRoot: __dirname,
  resetCache: true, // optional, but circumvents stale cache issues
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

While Metro is the de-facto standard, it lacks a few features that would make it optimal; here's our current wishlist, feel free to submit PRs if you want to help with them :)

- Implement [Circular Dependency Plugin](https://github.com/aackerman/circular-dependency-plugin)
- Implement [DuplicatesPlugin](https://github.com/FormidableLabs/inspectpack#plugin)
- Implement [symlinks](https://github.com/facebook/metro/issues/1)
  - *ideally this will be done directly upstream in Metro, but in the meantime we are open to "after-markets" solutions*
- Implement treeshaking

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
