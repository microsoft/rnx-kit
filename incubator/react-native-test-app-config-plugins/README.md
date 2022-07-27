# @rnx-kit/react-native-test-app-config-plugins

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-test-app-config-plugins)](https://www.npmjs.com/package/@rnx-kit/react-native-test-app-config-plugins)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### This tool is EXPERIMENTAL - USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

[@expo/config-plugins](https://docs.expo.dev/guides/config-plugins/) support
module for
[react-native-test-app](https://github.com/microsoft/react-native-test-app).

Most Expo config plugins should work out of box. You should check out
[Expo's documentation](https://docs.expo.dev/guides/config-plugins/) for how to
use plugins, as well as writing your own.

## Installation

```sh
yarn add @rnx-kit/react-native-test-app-config-plugins --dev
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/react-native-test-app-config-plugins
```

## Using a Plugin in Your App

In your app's config (`app.json`), you can add plugins to the `plugins` section:

```diff
 {
   "name": "Example",
+  "plugins": ["module-with-config-plugin"]
 }
```

You can also pass options to the plugin by wrapping both in an array:

```diff
 {
   "name": "Example",
+  "plugins": [
+    ["module-with-config-plugin", { "myOption": "value" }]
+  ]
 }
```

For more details, please refer to
[Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/#using-a-plugin-in-your-app).

Note that Expo specific mods are not implemented. These include:

- `mods.ios.expoPlist`
- `mods.ios.podfileProperties`
