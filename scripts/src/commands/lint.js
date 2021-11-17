// @ts-check

const { execute } = require("../process");

/** @type {import("../process").Command} */
module.exports = (_args, rawArgs = []) =>
  execute("eslint", "--config", "package.json", "src/*", ...rawArgs);
