# Change Log - @rnx-kit/metro-plugin-typescript-validation

This log was last generated on Wed, 12 May 2021 05:52:23 GMT and should not be manually modified.

<!-- Start content -->

## 1.0.2

Wed, 12 May 2021 05:52:23 GMT

### Patches

- Fixes for the Metro TypeScript plugin. 1. Filter the list of checked files to ts[x]. Include js[x] when both allowJs and checkJs compiler options are true. 2. When 'extends' tsconfig prop refers to relative file, re-relativize since our generated metro tsconfig will be in node_modules. (afoxman@microsoft.com)

## 1.0.1

Fri, 07 May 2021 19:27:01 GMT

### Patches

- Create a typescript validation plugin for Metro. Add the plugin to our test-app package. Update test-app source files to typescript, and change the Metro entry file from lib (transpiled) to src. (afoxman@microsoft.com)
