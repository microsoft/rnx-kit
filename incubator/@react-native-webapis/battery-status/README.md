# @react-native-webapis/battery-status

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@react-native-webapis/battery-status)](https://www.npmjs.com/package/@react-native-webapis/battery-status)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

[Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API)
for React Native.

> [!NOTE]
>
> This is purely a prototype for the
> [React Native WebAPIs RFC](https://github.com/microsoft/rnx-kit/pull/2504). It
> currently does not implement the Battery Status API to spec, e.g. it's missing
> events and its properties are not updated live. Rather, its purpose is to show
> that it's possible to have a native module polyfill a web API, enabling direct
> use of previously web-only code in a React Native app.

## Installation

```sh
yarn add @rnx-kit/polyfills --dev
yarn add @react-native-webapis/battery-status
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/polyfills
npm add @react-native-webapis/battery-status
```

## Usage

```diff
diff --git a/packages/test-app/babel.config.js b/packages/test-app/babel.config.js
index 69ebd557..a012b7f5 100644
--- a/packages/test-app/babel.config.js
+++ b/packages/test-app/babel.config.js
@@ -13,6 +13,7 @@ module.exports = {
           { runtime: "automatic" },
         ],
         [require("@babel/plugin-transform-react-jsx-source")],
+        [require("@rnx-kit/polyfills")],
       ],
     },
   ],
diff --git a/packages/test-app/src/App.native.tsx b/packages/test-app/src/App.native.tsx
index 599634a9..a9b493ab 100644
--- a/packages/test-app/src/App.native.tsx
+++ b/packages/test-app/src/App.native.tsx
@@ -1,3 +1,5 @@
+// @react-native-webapis
+
 import { acquireTokenWithScopes } from "@rnx-kit/react-native-auth";
 // Both `internal` imports are used to verify that `metro-resolver-symlinks`
 // resolves them correctly when `experimental_retryResolvingFromDisk` is
@@ -7,7 +9,7 @@ import {
   getRemoteDebuggingAvailability,
 } from "internal";
 import { getHermesVersion } from "internal/hermes";
-import React, { useCallback, useMemo, useState } from "react";
+import React, { useCallback, useEffect, useMemo, useState } from "react";
 import type { LayoutChangeEvent } from "react-native";
 import {
   NativeModules,
@@ -186,6 +188,14 @@ function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
     [setFabric]
   );

+  const [batteryLevel, setBatteryLevel] = useState(-1);
+  useEffect(() => {
+    // @ts-expect-error FIXME
+    navigator.getBattery().then((status) => {
+      setBatteryLevel(status.level);
+    });
+  }, []);
+
   return (
     <SafeAreaView style={styles.body}>
       <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
@@ -195,6 +205,9 @@ function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
         style={styles.body}
       >
         <Header />
+        <View style={styles.group}>
+          <Feature value={batteryLevel.toFixed(2)}>Battery Level</Feature>
+        </View>
         <View style={styles.group}>
           <Button onPress={startAcquireToken}>Acquire Token</Button>
         </View>
```
