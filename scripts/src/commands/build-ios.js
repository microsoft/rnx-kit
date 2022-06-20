// @ts-check

const path = require("path");
const { execute } = require("../process");

/** @type {import("../process").Command} */
module.exports = async (_args, rawArgs) => {
  return execute(path.join(__dirname, "build-ios.sh"), ...(rawArgs ?? []));
};
