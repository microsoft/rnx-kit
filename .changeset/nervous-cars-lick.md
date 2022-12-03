---
"@rnx-kit/typescript-react-native-compiler": patch
---

BREAKING: remove command-line parameters 'traceReactNativeModuleResolutionErrors' and 'traceResolutionLog' which were used for configuring custom trace logging. From this version onward, standard TypeScript trace logging should be used. This amounts to setting the compiler option 'traceResolution' to true. Trace messages will appear on the console. Logging to a file is no longer supported.
