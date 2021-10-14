# @rnx-kit/react-native-test-app-msal

[Microsoft Authentication Library](http://aka.ms/aadv2) module for
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

Add `use_frameworks!` to your `Podfile`, e.g.:

```diff
 require_relative '../node_modules/react-native-test-app/test_app'

 workspace 'MyTestApp.xcworkspace'

+use_frameworks!
+use_flipper! false
 use_test_app!
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
+      "appKey": "MicrosoftAccounts"
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

Set up your unique bundle identifier
([how to get your unique bundle identifier](https://docs.microsoft.com/en-gb/azure/active-directory/develop/quickstart-v2-ios#register-and-download-your-quickstart-app)),
and the scopes that you want access to:

```diff
 {
   "name": "MyTestApp",
   "displayName": "MyTestApp",
   "components": [
     {
       "appKey": "MyTestApp",
     },
     {
       "appKey": "MicrosoftAccounts"
     }
   ],
+  "ios": {
+    "bundleIdentifier": "com.contoso.MyTestApp"
+  },
+  "react-native-test-app-msal": {
+    "clientId": "00000000-0000-0000-0000-000000000000",
+    "msaScopes": ["user.read"],
+    "orgScopes": ["<Application ID URL>/scope"]
+  },
   "resources": {
     "android": ["dist/res", "dist/main.android.jsbundle"],
     "ios": ["dist/assets", "dist/main.ios.jsbundle"],
     "macos": ["dist/assets", "dist/main.macos.jsbundle"],
     "windows": ["dist/assets", "dist/main.windows.bundle"]
   }
 }
```
