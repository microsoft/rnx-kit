// @ts-check
"use strict";

const path = require("node:path");

try {
  const eslint = path.dirname(require.resolve("eslint/package.json"));
  const eslintjs = require.resolve("@eslint/js", { paths: [eslint] });
  // oxlint-disable-next-line typescriptban-ts-comment
  // @ts-ignore `tsgo` trips on this because it's not top level enough
  module.exports = require(eslintjs);
} catch (_) {
  // oxlint-disable-next-line typescriptban-ts-comment
  // @ts-ignore `tsgo` trips on this because it's not top level enough
  module.exports = require("@eslint/js");
}
