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
  },
  rules: require("./rules").rules,
};
