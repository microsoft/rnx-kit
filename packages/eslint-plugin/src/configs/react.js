// @ts-check
"use strict";

const { FlatCompat } = require("@eslint/eslintrc");
const react = require("eslint-plugin-react");
const eslint = require("./eslint");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslint.configs.recommended,
});

module.exports = [
  ...compat.extends("plugin:react-hooks/recommended"),
  react.configs.flat.recommended,
  {
    name: "rnx-kit/react",
    rules: {
      "react/prop-types": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
