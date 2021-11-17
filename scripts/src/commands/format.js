// @ts-check

const { execute } = require("../process");

/** @type {import("../process").Command} */
module.exports = () =>
  execute(
    "prettier",
    "--write",
    "--loglevel",
    "error",
    "**/*.{js,json,jsx,md,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*"
  );
