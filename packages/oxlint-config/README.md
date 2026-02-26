# @rnx-kit/oxlint-config

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/oxlint-config)](https://www.npmjs.com/package/@rnx-kit/oxlint-config)

`@rnx-kit/oxlint-config` is a set of configurations that can be used as is, or
extended in your own oxlint config.

## Install

```
yarn add @rnx-kit/oxlint-config --dev
```

or if you're using npm:

```
npm add --save-dev @rnx-kit/oxlint-config
```

## Usage

Several configurations are exported by this package. For instance, to use the
[`recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/recommended.ts)
configuration, you can re-export it in your config like so:

```ts
import config from "@rnx-kit/oxlint-config";
export default config;
```

Alternatively, if you want to add customizations:

```ts
import recommended from "@rnx-kit/oxlint-config";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [recommended],
  plugins: ["import"],
  rules: {
    "import/no-default-export": "error",
    "no-unneeded-ternary": "error",
  },
});
```

## Recommended Configurations

- [`@rnx-kit/oxlint-config/recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/recommended.ts)
  (or `@rnx-kit/oxlint-config` for short) enables:
  - `correctness` rules for `eslint`, `import`, `node`, `oxc`, `react`,
    `typescript`, `unicorn`
  - All the equivalent rules found in (where possible):
    - [`eslint:recommended`](https://eslint.org/docs/rules/)
    - [`@typescript-eslint/recommended`](https://typescript-eslint.io/linting/configs#recommended)
    - [`react-hooks/recommended`](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks#readme)
    - [`react/recommended`](https://github.com/yannickcr/eslint-plugin-react#recommended)
  - It also includes and enables the following rules:
    - [`@react-native/platform-colors`](https://github.com/facebook/react-native/tree/main/packages/eslint-plugin-react-native#readme)
      (as JS plugin)
- [`@rnx-kit/oxlint-config/strict`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/strict.ts)
  extends `@rnx-kit/oxlint-config/recommended` with rules that enables better
  tree shaking:
  - [`@rnx-kit/no-const-enum`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-const-enum.js)
    (as JS plugin)
  - [`@rnx-kit/no-export-all`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-export-all.js)
    (as JS plugin)
  - [`@rnx-kit/no-foreach-with-captured-variables`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-foreach-with-captured-variables.js)
    (as JS plugin)
  - [`import/no-default-export`](https://oxc.rs/docs/guide/usage/linter/rules/import/no-default-export.html)
  - [`no-unneeded-ternary`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-unneeded-ternary.html)
- [`@rnx-kit/oxlint-config/types-only`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/types-only.ts)
  enables rules for types only modules

Additionally, we also export the following configurations to ease the migration
from ESLint:

- [`eslint:recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/eslint-recommended.ts)
- [`@typescript-eslint/recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/typescript-recommended.ts)
- [`@microsoft/sdl/common`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/sdl-common.ts)
- [`@microsoft/sdl/node`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/sdl-node.ts)
- [`@microsoft/sdl/react`](https://github.com/microsoft/rnx-kit/blob/main/packages/oxlint-config/src/configs/sdl-react.ts)

## Supported Rules

- ✓: Enabled with `@rnx-kit/oxlint-config/recommended`
- 🔧: Fixable with `--fix`

|  ✓  | 🔧  | Rule                                                                                                                                                                   | Description                                                                                                                                                                                                                                                                                                     |
| :-: | :-: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  ✓  |     | [`@rnx-kit/no-const-enum`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-const-enum.js)                                           | disallow `const enum` ([why is it bad?](https://hackmd.io/bBcd6R-1TB6Zq95PSquooQ))                                                                                                                                                                                                                              |
|  ✓  | 🔧  | [`@rnx-kit/no-export-all`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-export-all.js)                                           | disallow `export *` ([why is it bad?](https://hackmd.io/Z021hgSGStKlYLwsqNMOcg))                                                                                                                                                                                                                                |
|  ✓  |     | [`@rnx-kit/no-foreach-with-captured-variables`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-foreach-with-captured-variables.js) | disallow `forEach` with outside variables; JavaScript is not efficient when it comes to using variables defined outside of its scope, and repeatedly calling that function can lead to performance issues. By using a `for...of` loop, you can avoid these performance pitfalls and also it is easier to debug. |
|     |     | [`@rnx-kit/type-definitions-only`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/type-definitions-only.js)                           | disallow anything but type definitions; useful for types only files or packages                                                                                                                                                                                                                                 |
