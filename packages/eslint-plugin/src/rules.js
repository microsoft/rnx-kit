// @ts-check
"use strict";

module.exports = {
  rules: {
    "no-const-enum": require("./rules/no-const-enum.js"),
    "no-export-all": require("./rules/no-export-all.js"),
    "no-foreach-with-captured-variables": require("./rules/no-foreach-with-captured-variables.js"),
    "no-unnecessary-arrays": require("./rules/no-unnecessary-arrays.js"),
    "restricted-asset-imports": require("./rules/restricted-asset-imports.js"),
    "type-definitions-only": require("./rules/type-definitions-only.js"),
  },
};
