// @ts-check

import * as fs from "node:fs";

/** @type {import("../process.js").Command} */
export async function clean() {
  const options = { force: true, maxRetries: 3, recursive: true };
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
  ].map((dir) => fs.rmSync(dir, options));
}
