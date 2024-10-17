// @ts-check
"use strict";

const path = require("node:path");

try {
  const eslint = path.dirname(require.resolve("eslint/package.json"));
  const eslintjs = require.resolve("@eslint/js", { paths: [eslint] });
  module.exports = require(eslintjs);
} catch (_) {
  module.exports = require("@eslint/js");
}
