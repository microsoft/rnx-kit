<!--remove-block start-->

# @rnx-kit/react-native-test-app-msal

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/react-native-test-app-msal)](https://www.npmjs.com/package/@rnx-kit/react-native-test-app-msal)

<!--remove-block end-->

[Microsoft Authentication Library](http://aka.ms/aadv2) (MSAL) module for
[React Native Test App](https://github.com/microsoft/react-native-test-app#readme).

## Install

Add `@rnx-kit/react-native-test-app-msal` as a dev dependency:

```
yarn add @rnx-kit/react-native-test-app-msal --dev
```

or if you're using `npm`:

```
npm add --save-dev @rnx-kit/react-native-test-app-msal
```

### iOS/macOS

We need to set the deployment target for iOS and macOS to 14.0 and 11.0 (or
higher) respectively, and add `MSAL` to `Podfile`:

```diff
+platform :ios, '14.0'    # If targeting iOS, discard the line below
+platform :macos, '11.0'  # If targeting macOS, discard the line above
+
 require_relative '../node_modules/react-native-test-app/test_app'

 workspace 'MyTestApp.xcworkspace'

+use_test_app! do |target|
+  target.app do
+    # We must use modular headers here otherwise Swift compiler will fail
+    pod 'MSAL', :modular_headers => true
+  end
+end
```

## Usage

Add an entry for the account switcher in your `app.json`, e.g.:

```diff
 {
   "name": "MyTestApp",
   "displayName": "MyTestApp",
   "components": [
     {
       "appKey": "MyTestApp",
+    },
+    {
+      "appKey": "com.microsoft.reacttestapp.msal.MicrosoftAccountsActivity",
+      "displayName": "MicrosoftAccounts (Android)"
+    },
+    {
+      "appKey": "MicrosoftAccounts",
+      "displayName": "MicrosoftAccounts (iOS/macOS)"
     }
   ],
   "resources": {
     "android": ["dist/res", "dist/main.android.bundle"],
     "ios": ["dist/assets", "dist/main.ios.jsbundle"],
     "macos": ["dist/assets", "dist/main.macos.jsbundle"],
     "windows": ["dist/assets", "dist/main.windows.bundle"]
   }
 }
```

Register your app with a unique bundle identifier to get your Azure Active
Directory client identifier and related scopes
([quickstart here](https://docs.microsoft.com/en-gb/azure/active-directory/develop/quickstart-v2-ios#register-and-download-your-quickstart-app)),
then fill out the following fields in `app.json`:

```diff
 {
   "name": "MyTestApp",
   "displayName": "MyTestApp",
   "components": [
     {
       "appKey": "MyTestApp",
     },
     {
       "appKey": "com.microsoft.reacttestapp.msal.MicrosoftAccountsActivity",
       "displayName": "MicrosoftAccounts (Android)"
     },
     {
       "appKey": "MicrosoftAccounts",
       "displayName": "MicrosoftAccounts (iOS/macOS)"
     }
   ],
+  "android": {
+    "package": "com.contoso.MyTestApp"
+  },
+  "ios": {
+    "bundleIdentifier": "com.contoso.MyTestApp"
+  },
+  "macos": {
+    "bundleIdentifier": "com.contoso.MyTestApp"
+  },
+  "react-native-test-app-msal": {
+    "clientId": "4b0db8c2-9f26-4417-8bde-3f0e3656f8e0",
+    "msaScopes": ["user.read"],
+    "orgScopes": ["user.read"],
+    "signatureHash": "1wIqXSqBj7w+h11ZifsnqwgyKrY="
+  },
   "resources": {
     "android": ["dist/res", "dist/main.android.jsbundle"],
     "ios": ["dist/assets", "dist/main.ios.jsbundle"],
     "macos": ["dist/assets", "dist/main.macos.jsbundle"],
     "windows": ["dist/assets", "dist/main.windows.bundle"]
   }
 }
```

## Getting a Token from Native Code

A token can be acquired from native code using the `TokenBroker` singleton.

### Android

On Android, we will need the `Context` to retrieve the singleton, and the
current `Activity` to acquire a token. We need the `Activity` in case we need to
ask the user to log in:

```kotlin
import com.microsoft.reacttestapp.msal.TokenBroker

TokenBroker.getInstance(context).acquireToken(context.currentActivity, ...) { result, error ->
  // handle result here
}
```

### iOS/macOS

On iOS/macOS, we will need the current `UIViewController` (iOS) or
`NSViewController` (macOS) to acquire a token in case we need to ask the user to
log in:

```swift
import ReactTestApp_MSAL

TokenBroker.shared.acquireToken(scopes: ..., sender: viewController) { result, error ->
  // handle result here
}
```
