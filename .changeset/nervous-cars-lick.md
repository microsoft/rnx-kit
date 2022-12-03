---
"@rnx-kit/typescript-react-native-compiler": patch
---

BREAKING: remove command-line parameters
'traceReactNativeModuleResolutionErrors' and 'traceResolutionLog' which were
used for configuring custom trace logging. From this version onward, standard
TypeScript module resolution tracing applies. Set the compiler option
'traceResolution' to true, and you will see trace messages appear in the
console. Logging to a file is no longer supported.
