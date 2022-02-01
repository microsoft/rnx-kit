# @rnx-kit/eslint-plugin

`@rnx-kit/eslint-plugin` is a set of rules that can be extended in your own
shareable ESLint config.

For more details on shareable configs, see
https://eslint.org/docs/developer-guide/shareable-configs.

## Install

```
yarn add @rnx-kit/eslint-plugin --dev
```

or if you're using npm:

```
npm add --save-dev @rnx-kit/eslint-plugin
```

## Recommended Configs

This ESLint plugin exports
[`@rnx-kit/recommended`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/configs/recommended.js)
configuration. To enable it, add it to the `extends` section of your ESLint
config file:

```json
{
  "extends": ["plugin:@rnx-kit/recommended"]
}
```

`@rnx-kit/recommended` currently extends:

- [`eslint:recommended`](https://eslint.org/docs/rules/)
- [`plugin:@typescript-eslint/recommended`](https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin#supported-rules)
- [`plugin:react/recommended`](https://github.com/yannickcr/eslint-plugin-react#recommended)

## Supported Rules

- ✓: Enabled with `@rnx-kit/recommended`
- 🔧: Fixable with `--fix`

|  ✓  | 🔧  | Rule                                                                                                                         | Description         |
| :-: | :-: | :--------------------------------------------------------------------------------------------------------------------------- | :------------------ |
|  ✓  | 🔧  | [`@rnx-kit/no-export-all`](https://github.com/microsoft/rnx-kit/blob/main/packages/eslint-plugin/src/rules/no-export-all.js) | disallow `export *` |
