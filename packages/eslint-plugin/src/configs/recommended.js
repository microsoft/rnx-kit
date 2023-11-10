// @ts-check
"use strict";

const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended"
  ),
  {
    languageOptions: {
      // @ts-expect-error No declaration file for module
      parser: require("@typescript-eslint/parser"),
    },
    plugins: {
      // @ts-expect-error No declaration file for module
      "@react-native": require("@react-native/eslint-plugin"),
      "@rnx-kit": require("../rules"),
    },
    rules: {
      "@react-native/platform-colors": "error",
      "@rnx-kit/no-const-enum": "warn",
      "@rnx-kit/no-export-all": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          disallowTypeAnnotations: false,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-var-requires": "off",
      "react/prop-types": "off",
    },
  },
];
