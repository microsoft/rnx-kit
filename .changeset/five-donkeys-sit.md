---
"@rnx-kit/react-native-test-app-msal": patch
---

Fixed `msal_config.json` being generated before the `:app:clean` task is run, causing MSAL to throw an exception on initialisation because of the missing configuration file.
