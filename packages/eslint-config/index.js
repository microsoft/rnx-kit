module.exports = {
  extends: ["plugin:@microsoft/sdl/required", "plugin:@rnx-kit/recommended"],
  rules: {
    "@rnx-kit/no-export-all": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        disallowTypeAnnotations: false,
      },
    ],
  },
};
