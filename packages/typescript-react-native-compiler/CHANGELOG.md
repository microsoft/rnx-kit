# Change Log - @rnx-kit/typescript-react-native-compiler

## 0.0.9

### Patch Changes

- 94aeb460: BREAKING: remove command-line parameters
  'traceReactNativeModuleResolutionErrors' and 'traceResolutionLog' which were
  used for configuring custom trace logging. From this version onward, standard
  TypeScript module resolution tracing applies. Set the compiler option
  'traceResolution' to true, and you will see trace messages appear in the
  console. Logging to a file is no longer supported.
- Updated dependencies [94aeb460]
  - @rnx-kit/typescript-react-native-resolver@0.3.0

## 0.0.8

### Patch Changes

- 569a099: Bump @rnx-kit/tools-node to v1.2.7

## 0.0.7

### Patch Changes

- Updated dependencies [28f632a]
  - @rnx-kit/typescript-react-native-resolver@0.2.0

## 0.0.6

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.6
- Bump @rnx-kit/tools-node to v1.2.6
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.3
- Bump @rnx-kit/typescript-service to v1.5.3

## 0.0.5

Fri, 19 Nov 2021 16:08:47 GMT

### Patches

- Bump @rnx-kit/typescript-react-native-resolver to v0.1.2
- Bump @rnx-kit/typescript-service to v1.5.2

## 0.0.4

Thu, 18 Nov 2021 20:51:05 GMT

### Patches

- Bump @rnx-kit/tools-language to v1.2.5
- Bump @rnx-kit/tools-node to v1.2.5
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.1
- Bump @rnx-kit/typescript-service to v1.5.1

## 0.0.3

Tue, 09 Nov 2021 21:11:31 GMT

### Patches

- Update the CLI's Metro/TS integration to use the new, generalized resolver in @rnx-kit/typescript-react-native-resolver. Remove the unneeded "default" resolver. (afoxman@microsoft.com)
- Bump @rnx-kit/typescript-react-native-resolver to v0.1.0
- Bump @rnx-kit/typescript-service to v1.5.0

## 0.0.2

Fri, 05 Nov 2021 19:44:16 GMT

### Patches

- Create the typescript-react-native-compiler package (afoxman@microsoft.com)
- Bump @rnx-kit/tools-language to v1.2.4
- Bump @rnx-kit/tools-node to v1.2.4
- Bump @rnx-kit/typescript-react-native-resolver to v0.0.5
- Bump @rnx-kit/typescript-service to v1.4.3
