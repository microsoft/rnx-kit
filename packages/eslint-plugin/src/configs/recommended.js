// @ts-check
"use strict";

const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

/**
 * @param {string} spec
 * @returns {boolean}
 */
function isInstalled(spec) {
  try {
    return Boolean(require.resolve(spec, { paths: [process.cwd()] }));
  } catch (_) {
    return false;
  }
}

const usesReact = isInstalled("react");
const configs = ["plugin:@typescript-eslint/recommended"];
if (usesReact) {
  configs.push("plugin:react-hooks/recommended", "plugin:react/recommended");
}

module.exports = [
  ...compat.extends(...configs),
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
      ...(usesReact ? { "react/prop-types": "off" } : {}),
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
