// @ts-check

const { cleanTask } = require("just-scripts");
const path = require("path");

exports.clean = cleanTask({
  paths: [
    "bin",
    "coverage",
    "dist",
    "lib",
    "lib-amd",
    "lib-commonjs",
    "lib-es2015",
    "lib-es6",
    "temp",
  ].map((p) => path.join(process.cwd(), p)),
});
