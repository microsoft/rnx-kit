// @ts-check

const { runScript } = require("../process");

/** @type {import("../process").Command} */
module.exports = (_args, rawArgs = []) =>
  runScript("eslint", "--config", "package.json", "src/*", ...rawArgs);
