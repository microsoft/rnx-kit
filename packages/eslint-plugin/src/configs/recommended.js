// @ts-check
"use strict";

const tseslint = require("typescript-eslint");
const eslint = require("./eslint");

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
const reactConfigs = usesReact ? require("./react") : [];

module.exports = [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...reactConfigs,
  {
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
        { disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off", // Catches valid expressions like template literals
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-var-requires": "off",
      "no-undef": "off",
      ...(usesReact ? { "react/prop-types": "off" } : {}),
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
