# Change Log - @rnx-kit/typescript-react-native-resolver

## 0.3.0

### Minor Changes

- 94aeb460: BREAKING: update the public method 'changeHostToUseReactNativeResolver'. Remove
  trace logging parameters. From this version onward, standard TypeScript module
  resolution tracing applies. Set the compiler option 'traceResolution' to true,
  and you will see trace messages appear in the console. Logging to a file is no
  longer supported.

## 0.2.3

### Patch Changes

- 7cf554bf: Add support for new type-directive resolution in TS 4.7

## 0.2.2

### Patch Changes

- 569a099: Bump @rnx-kit/tools-node to v1.2.7

## 0.2.1

### Patch Changes

- adf6feb: Get available platforms from disk instead of using a hard-coded list
- Updated dependencies [adf6feb]
  - @rnx-kit/tools-react-native@1.2.0

## 0.2.0

### Minor Changes

- 28f632a: Resolve modules in 3 passes - TS, then JS, then JSON. Also, always resolve to JS files -- don't gate on checkJs anymore.

## 0.1.4

### Patch Changes

- bea8385: When resolving imports in a .d.ts file, allow .json files when compilerOptions.resolveJsonModule is true.

## 0.1.3

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Bump @rnx-kit/tools-node to v1.2.6

## 0.1.2

Fri, 19 Nov 2021 16:08:47 GMT

### Patches

- When modifying a TypeScript host, only change trace() when logging is enabled. Also, when changing file/directory APIs, bind the original calls to the host so that the 'this' reference is set properly. (afoxman@microsoft.com)

## 0.1.1

Thu, 18 Nov 2021 20:51:05 GMT

### Patches

- Bump @rnx-kit/tools-node to v1.2.5

## 0.1.0

Tue, 09 Nov 2021 21:11:31 GMT

### Minor changes

- Update the CLI's Metro/TS integration to use the new, generalized resolver in @rnx-kit/typescript-react-native-resolver. Remove the unneeded "default" resolver. (afoxman@microsoft.com)

## 0.0.5

Fri, 05 Nov 2021 19:44:16 GMT

### Patches

- update package dependencies (afoxman@microsoft.com)

## 0.0.4

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Bump @rnx-kit/tools-node to v1.2.4

## 0.0.3

Fri, 05 Nov 2021 07:33:42 GMT

### Patches

- Use regex test method instead of match. (afoxman@microsoft.com)
- Bump @rnx-kit/tools-node to v1.2.3

## 0.0.2

Thu, 04 Nov 2021 22:26:34 GMT

### Patches

- Create the typescript-react-native-resolver package (afoxman@microsoft.com)
- Bump @rnx-kit/tools-node to v1.2.2
