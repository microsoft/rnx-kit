// @ts-check

const { discardResult } = require("../process");

/** @type {import("../process").Command} */
module.exports = () => {
  const fs = require("fs-extra");
  return Promise.all(
    [
      "bin",
      "coverage",
      "dist",
      "lib",
      "lib-amd",
      "lib-commonjs",
      "lib-es2015",
      "lib-es6",
      "temp",
    ].map((dir) => fs.remove(dir))
  ).then(discardResult);
};
