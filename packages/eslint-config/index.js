const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");
const rnx = require("@rnx-kit/eslint-plugin");

const compat = new FlatCompat({
  // Use `@rnx-kit/eslint-plugin` as base directory to ensure we get the same
  // plugin instances
  baseDirectory: require.resolve("@rnx-kit/eslint-plugin/package.json"),
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...rnx.configs.strict,
  ...compat.extends(
    "plugin:@microsoft/sdl/required",
    "plugin:@typescript-eslint/stylistic"
  ),
  {
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    },
  },
];
