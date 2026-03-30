// @ts-check
"use strict";

const { name, version } = require("../package.json");

/**
 * @import { Rule } from "eslint";
 * @typedef {{ name?: string; rules?: object }} Config
 * @type {{
 *   meta: { name: string; version: string };
 *   configs: {
 *     recommended: Config[];
 *     strict: Config[];
 *     stylistic: Config[];
 *   };
 *   rules: Record<string, Rule.RuleModule>;
 * }}
 */
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
