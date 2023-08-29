module.exports = {
  extends: [
    "plugin:@microsoft/sdl/required",
    "plugin:@rnx-kit/recommended",
    "plugin:@typescript-eslint/stylistic",
  ],
  rules: {
    "@rnx-kit/no-const-enum": "error",
    "@rnx-kit/no-export-all": "error",
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
  },
};
