# @rnx-kit/react-native-test-app-msal

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

### iOS

Set iOS deployment target to 14.0, and add `MSAL` to your `Podfile`, e.g.:

```diff
+platform :ios, '14.0'
 require_relative '../node_modules/react-native-test-app/test_app'

 workspace 'MyTestApp.xcworkspace'

+use_test_app! do |target|
+  target.app do
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
