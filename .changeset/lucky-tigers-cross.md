---
"@rnx-kit/react-native-test-app-msal": patch
---

Throw if `msal_config.json` is missing, otherwise Android will throw a cryptic/generic exception that's hard to debug.
