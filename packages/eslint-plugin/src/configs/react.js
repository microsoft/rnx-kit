// @ts-check
"use strict";

const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  react.configs.flat?.recommended ?? {
    plugins: { react },
    rules: react.configs.recommended.rules,
    languageOptions: { parserOptions: react.configs.recommended.parserOptions },
  },
  reactHooks.configs["recommended-latest"],
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
