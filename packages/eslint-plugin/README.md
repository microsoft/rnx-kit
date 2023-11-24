# @rnx-kit/eslint-plugin

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/eslint-plugin)](https://www.npmjs.com/package/@rnx-kit/eslint-plugin)

`@rnx-kit/eslint-plugin` is a set of configurations and rules that can be used
as is, or extended in your own ESLint config.

Note that this plugin requires the
[new ESLint configuration format](https://eslint.org/blog/2022/08/new-config-system-part-2/).
If you still rely on the previous format, use version 0.5.x instead.

## Install

```
yarn add @rnx-kit/eslint-plugin --dev
```

or if you're using npm:

```
npm add --save-dev @rnx-kit/eslint-plugin
```

## Usage

This ESLint plugin exports multiple configurations. For instance, to use the
[`recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/configs/recommended.js)
configuration, you can re-export it in your
[flat config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
like below:

```js
module.exports = require("@rnx-kit/eslint-plugin/recommended");
```

Alternatively, if you want to add customizations:

```js
const rnx = require("@rnx-kit/eslint-plugin");
module.exports = [
  ...rnx.configs.recommended,
  {
    rules: {
      "@rnx-kit/no-const-enum": "error",
      "@rnx-kit/no-export-all": "error",
    },
  },
];
```

If you're just interested in the rules, you can use it as a plugin and enable
the rules you're interested in:

```js
module.exports = [
  {
    plugins: {
      "@rnx-kit": require("@rnx-kit/eslint-plugin"),
    },
    rules: {
      "@rnx-kit/no-const-enum": "error",
      "@rnx-kit/no-export-all": "error",
    },
  },
];
```

## Recommended Configurations

- [`@rnx-kit/eslint-plugin/recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/configs/recommended.js)
  extends:
  - [`eslint:recommended`](https://eslint.org/docs/rules/)
  - [`plugin:@typescript-eslint/recommended`](https://typescript-eslint.io/linting/configs#recommended)
  - [`plugin:react-hooks/recommended`](https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks#readme)
  - [`plugin:react/recommended`](https://github.com/yannickcr/eslint-plugin-react#recommended)
  - It also includes and enables the following rules:
    - [`@react-native/platform-colors`](https://github.com/facebook/react-native/tree/main/packages/eslint-plugin-react-native#readme)
- [`@rnx-kit/eslint-plugin/strict`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/configs/strict.js)
  extends `@rnx-kit/eslint-plugin/recommended` with rules that enables better
  tree shaking:
  - [`@rnx-kit/no-const-enum`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-const-enum.js)
  - [`@rnx-kit/no-export-all`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-export-all.js)
  - [`no-restricted-exports`](https://archive.eslint.org/docs/rules/no-restricted-exports)

## Supported Rules

- ✓: Enabled with `@rnx-kit/eslint-plugin/recommended`
- 🔧: Fixable with `--fix`

|  ✓  | 🔧  | Rule                                                                                                                         | Description                                                                        |
| :-: | :-: | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
|  ✓  |     | [`@rnx-kit/no-const-enum`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-const-enum.js) | disallow `const enum` ([why is it bad?](https://hackmd.io/bBcd6R-1TB6Zq95PSquooQ)) |
|  ✓  | 🔧  | [`@rnx-kit/no-export-all`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-export-all.js) | disallow `export *` ([why is it bad?](https://hackmd.io/Z021hgSGStKlYLwsqNMOcg))   |
