// @ts-check

const { execute } = require("../process");

/** @type {import("../process").Command} */
module.exports = () =>
  execute("git", "clean", "-dfqX", "--exclude=node_modules");
