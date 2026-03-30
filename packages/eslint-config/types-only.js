const rnx = require("@rnx-kit/eslint-plugin");

/**
 * Configuration for type definitions only packages can be simplified because
 * they should contain no runtime code.
 */
module.exports = [
  ...rnx.configs.strict,
  ...rnx.configs.stylistic,
  {
    rules: {
      "@rnx-kit/type-definitions-only": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
