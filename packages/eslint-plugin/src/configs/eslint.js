// @ts-check
"use strict";

const path = require("node:path");

try {
  const eslint = path.dirname(require.resolve("eslint/package.json"));
  const eslintjs = require.resolve("@eslint/js", { paths: [eslint] });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore `tsgo` trips on this because it's not top level enough
  module.exports = require(eslintjs);
} catch (_) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore `tsgo` trips on this because it's not top level enough
  module.exports = require("@eslint/js");
}
