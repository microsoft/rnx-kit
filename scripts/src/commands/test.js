// @ts-check

const { runScript } = require("../process");

/** @type {import("../process").Command} */
module.exports = (_args, rawArgs = []) =>
  runScript("jest", "--passWithNoTests", ...rawArgs);
