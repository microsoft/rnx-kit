// @ts-check
"use strict";

/** @typedef {import("typescript-eslint")["configs"]["stylistic"]} StylisticConfig */

const { name, version } = require("../package.json");
module.exports = {
  meta: {
    name,
    version,
  },
  configs: {
    recommended: require("./configs/recommended"),
    strict: require("./configs/strict"),
    stylistic: /** @type {StylisticConfig} */ (
      require("typescript-eslint").configs.stylistic
    ),
  },
  rules: require("./rules").rules,
};
