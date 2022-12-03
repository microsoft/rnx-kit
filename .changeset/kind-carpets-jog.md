---
"@rnx-kit/typescript-react-native-resolver": minor
---

BREAKING: update the public method 'changeHostToUseReactNativeResolver'. Remove
trace logging parameters. From this version onward, standard TypeScript module
resolution tracing applies. Set the compiler option 'traceResolution' to true,
and you will see trace messages appear in the console. Logging to a file is no
longer supported.
