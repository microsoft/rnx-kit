# Change Log - @rnx-kit/metro-plugin-typescript-validation

This log was last generated on Wed, 04 Aug 2021 10:08:23 GMT and should not be manually modified.

<!-- Start content -->

## 1.0.7

Wed, 04 Aug 2021 10:08:23 GMT

### Patches

- Bump @rnx-kit/metro-plugin-typescript-validation to v1.0.7 (4123478+tido64@users.noreply.github.com)

## 1.0.6

Thu, 29 Jul 2021 19:42:04 GMT

### Patches

- Bump @rnx-kit/metro-plugin-typescript-validation to v1.0.6 (4123478+tido64@users.noreply.github.com)

## 1.0.5

Tue, 22 Jun 2021 15:04:23 GMT

### Patches

- Bumped workspace-tools to 0.16.2 (4123478+tido64@users.noreply.github.com)

## 1.0.4

Thu, 20 May 2021 06:03:39 GMT

### Patches

- Bumped workspace-tools to 0.15.1 (4123478+tido64@users.noreply.github.com)

## 1.0.3

Fri, 14 May 2021 07:34:43 GMT

### Patches

- When running TypeScript validation during bundle, check every file in the repository, not just the current package. (afoxman@microsoft.com)

## 1.0.2

Wed, 12 May 2021 05:52:23 GMT

### Patches

- Fixes for the Metro TypeScript plugin. 1. Filter the list of checked files to ts[x]. Include js[x] when both allowJs and checkJs compiler options are true. 2. When 'extends' tsconfig prop refers to relative file, re-relativize since our generated metro tsconfig will be in node_modules. (afoxman@microsoft.com)

## 1.0.1

Fri, 07 May 2021 19:27:01 GMT

### Patches

- Create a typescript validation plugin for Metro. Add the plugin to our test-app package. Update test-app source files to typescript, and change the Metro entry file from lib (transpiled) to src. (afoxman@microsoft.com)
