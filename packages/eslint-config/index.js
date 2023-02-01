module.exports = {
  extends: ["plugin:@microsoft/sdl/required", "plugin:@rnx-kit/recommended"],
  rules: {
    "@rnx-kit/no-const-enum": "error",
    "@rnx-kit/no-export-all": "error",
  },
};
