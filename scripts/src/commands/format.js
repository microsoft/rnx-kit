// @ts-check

const { runScript } = require("../process");

/** @type {import("../process").Command} */
module.exports = () =>
  runScript(
    "prettier",
    "--write",
    "--loglevel",
    "error",
    "**/*.{js,json,jsx,md,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*"
  );
