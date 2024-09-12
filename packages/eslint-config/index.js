const rnx = require("@rnx-kit/eslint-plugin");

module.exports = [
  ...rnx.configs.strict,
  ...rnx.configs.stylistic,
  {
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
