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

## Usage

Add `@rnx-kit/eslint-plugin` to your ESLint configuration file:

```js
module.exports = {
  extends: ["plugin:@rnx-kit/recommended"],
};
```
