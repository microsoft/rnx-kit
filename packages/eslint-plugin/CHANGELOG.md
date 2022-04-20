# Change Log - @rnx-kit/eslint-plugin

## 0.2.13

### Patch Changes

- 3ee09f6: Fix Rush workspaces not being detected when set up as a post-install step

## 0.2.12

### Patch Changes

- dec7c60: Fix no-export-all getting confused when the module id contains the `.js` extension due to how ESM works

## 0.2.11

### Patch Changes

- 5f2e378: Enable `react-hooks/recommended`

## 0.2.10

### Patch Changes

- b3308e9: Remove unused `eslint-plugin-jest`

## 0.2.9

### Patch Changes

- e0e19ad: Declarations should be exported as types

## 0.2.8

Tue, 30 Nov 2021 17:24:14 GMT

### Patches

- Drop optional chaining to support older Node versions (4123478+tido64@users.noreply.github.com)

## 0.2.7

Fri, 26 Nov 2021 09:20:19 GMT

### Patches

- Add proper support for `const` enums (4123478+tido64@users.noreply.github.com)

## 0.2.6

Tue, 23 Nov 2021 07:25:36 GMT

### Patches

- no-export-all: add support for namespaces (4123478+tido64@users.noreply.github.com)

## 0.2.5

Fri, 19 Nov 2021 09:22:42 GMT

### Patches

- no-export-all: Fix dupes sometimes showing up in fixed code (4123478+tido64@users.noreply.github.com)

## 0.2.4

Tue, 09 Nov 2021 19:26:57 GMT

### Patches

- Handle `project` field sometimes returning an array of strings, and add support for enums. (4123478+tido64@users.noreply.github.com)

## 0.2.3

Tue, 09 Nov 2021 08:21:42 GMT

### Patches

- Prefer parsing `.d.ts` over `.js` so we don't lose type information (4123478+tido64@users.noreply.github.com)

## 0.2.2

Fri, 05 Nov 2021 19:24:49 GMT

### Patches

- Fix no-export-all failing to parse files that are outside the TypeScript project (4123478+tido64@users.noreply.github.com)

## 0.2.1

Thu, 04 Nov 2021 17:54:44 GMT

### Patches

- Adds `module` to the list of main fields to consider, and options for setting max depth and enabling debug output. (4123478+tido64@users.noreply.github.com)

## 0.2.0

Wed, 03 Nov 2021 18:15:39 GMT

### Minor changes

- Implemented fixer for `no-export-all` (4123478+tido64@users.noreply.github.com)

## 0.1.2

Fri, 29 Oct 2021 12:14:31 GMT

### Patches

- Enable `ignoreRestSiblings` to allow prop omission (4123478+tido64@users.noreply.github.com)

## 0.1.1

Fri, 29 Oct 2021 10:31:10 GMT

### Patches

- Re-enable no-unused-vars. It looks like optional chaining is no longer causing false positives. (4123478+tido64@users.noreply.github.com)

## 0.1.0

Fri, 29 Oct 2021 08:51:30 GMT

### Minor changes

- @rnx-kit/eslint-plugin recommended ESLint rules for React devs (4123478+tido64@users.noreply.github.com)
