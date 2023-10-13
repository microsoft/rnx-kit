# @react-native-webapis/web-storage

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@react-native-webapis/web-storage)](https://www.npmjs.com/package/@react-native-webapis/web-storage)

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

### THIS TOOL IS EXPERIMENTAL — USE WITH CAUTION

🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧🚧

[Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
for React Native.

## Installation

```sh
yarn add @rnx-kit/polyfills --dev
yarn add @react-native-webapis/web-storage
```

or if you're using npm

```sh
npm add --save-dev @rnx-kit/polyfills
npm add @react-native-webapis/web-storage
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
index 599634a9..b068909a 100644
--- a/packages/test-app/src/App.native.tsx
+++ b/packages/test-app/src/App.native.tsx
@@ -1,3 +1,4 @@
+// @react-native-webapis
 import { acquireTokenWithScopes } from "@rnx-kit/react-native-auth";
 // Both `internal` imports are used to verify that `metro-resolver-symlinks`
 // resolves them correctly when `experimental_retryResolvingFromDisk` is
@@ -7,7 +8,7 @@ import {
   getRemoteDebuggingAvailability,
 } from "internal";
 import { getHermesVersion } from "internal/hermes";
-import React, { useCallback, useMemo, useState } from "react";
+import React, { useCallback, useEffect, useMemo, useState } from "react";
 import type { LayoutChangeEvent } from "react-native";
 import {
   NativeModules,
@@ -186,6 +187,14 @@ function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
     [setFabric]
   );

+  const [localValue, setLocalValue] = useState("Pending");
+  useEffect(() => {
+    const key = "sample/local-storage";
+    window.localStorage.setItem(key, "Success");
+    setLocalValue(window.localStorage.getItem(key) ?? "Failed");
+    return () => window.localStorage.removeItem(key);
+  }, []);
+
   return (
     <SafeAreaView style={styles.body}>
       <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
@@ -195,6 +204,9 @@ function App({ concurrentRoot }: { concurrentRoot?: boolean }) {
         style={styles.body}
       >
         <Header />
+        <View style={styles.group}>
+          <Feature value={localValue}>window.localStorage</Feature>
+        </View>
         <View style={styles.group}>
           <Button onPress={startAcquireToken}>Acquire Token</Button>
         </View>
```

## Rationale

`web-storage` is a new implementation that leverages platform APIs:

- Android:
  [SharedPreferences](https://developer.android.com/reference/android/content/SharedPreferences)
- iOS and macOS:
  [NSUserDefaults](https://developer.apple.com/documentation/foundation/nsuserdefaults)
- Windows:
  [ApplicationData.LocalSettings](https://learn.microsoft.com/en-us/uwp/api/windows.storage.applicationdata.localsettings)

Instead of using existing implementations, we opted for this because:

- The semantics and limitations of Web Storage API are very similar to the
  platform specific APIs. For instance, you're not supposed to store big data or
  you don't expect this data to be cloud-backed. We also get data consistency
  and resilience for free.
- SQLite is overkill for a simple key-value store, and comes with its own set of
  problems.
- In the past, devs have asked for the backing storage to be accessible from the
  native side as well. By using the platform's API, we get this for free.
- With zero external dependencies, the impact on your app size is low.

## Not yet implemented

- [`Storage.key()`](https://developer.mozilla.org/en-US/docs/Web/API/Storage/key)
  - None of the implementations guarantee the order of keys, i.e. `key(m)` and
    `key(n)` can both return the same key. We can probably work around this by
    keeping a snapshot. For now, this will remain unimplemented until someone
    actually needs it.
- [`storage` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
