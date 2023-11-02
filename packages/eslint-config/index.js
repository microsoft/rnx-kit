const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  ...compat.extends(
    "plugin:@microsoft/sdl/required",
    "plugin:@rnx-kit/recommended",
    "plugin:@typescript-eslint/stylistic"
  ),
  {
    rules: {
      "@rnx-kit/no-const-enum": "error",
      "@rnx-kit/no-export-all": "error",
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "no-restricted-exports": [
        "error",
        {
          restrictDefaultExports: {
            direct: true,
            named: true,
            defaultFrom: true,
            namedFrom: true,
            namespaceFrom: true,
          },
        },
      ],
    },
  },
];
