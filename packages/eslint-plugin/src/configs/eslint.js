// @ts-check
"use strict";

const eslintjs = (() => {
  const path = require("node:path");
  try {
    const eslint = path.dirname(require.resolve("eslint/package.json"));
    return require.resolve("@eslint/js", { paths: [eslint] });
  } catch (_) {
    return "@eslint/js";
  }
})();

module.exports = require(eslintjs);
