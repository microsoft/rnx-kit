// @ts-check
"use strict";

const { name, version } = require("../package.json");
module.exports = {
  meta: {
    name,
    version,
  },
  configs: {
    recommended: require("./configs/recommended"),
    strict: require("./configs/strict"),
    stylistic: require("typescript-eslint").configs.stylistic,
  },
  rules: require("./rules").rules,
};
