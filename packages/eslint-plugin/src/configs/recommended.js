// @ts-check
"use strict";

const { FlatCompat } = require("@eslint/eslintrc");
const js = (() => {
  const path = require("node:path");
  try {
    const eslint = path.dirname(require.resolve("eslint/package.json"));
    const eslintjs = require.resolve("@eslint/js", { paths: [eslint] });
    return require(eslintjs);
  } catch (_) {
    return require("@eslint/js");
  }
})();
const tseslint = require("typescript-eslint");

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
const reactConfigs = usesReact
  ? compat.extends("plugin:react-hooks/recommended", "plugin:react/recommended")
  : [];

module.exports = [
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
