// @ts-check

const { execute } = require("../process");

/** @type {import("../process").Command} */
module.exports = (_args, rawArgs = []) =>
  execute("tsc", "--outDir", "lib", ...rawArgs);
