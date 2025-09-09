// @ts-check
"use strict";

module.exports = {
  rules: {
    "no-const-enum": require("./rules/no-const-enum"),
    "no-export-all": require("./rules/no-export-all"),
    "forbid-foreach-with-variables-outside-of-function-scope": require("./rules/forbid-foreach-with-variables-outside-of-function-scope"),
  },
};
