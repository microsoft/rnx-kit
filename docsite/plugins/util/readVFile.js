/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const fs = require("fs");
const vfile = require("vfile");

/**
 * Read the given file, returning it as a virtual file object.
 *
 * @param {string} file File to read
 * @returns {import("vfile").VFile} Virtual file object
 */
function readVFile(file) {
  return vfile({
    contents: fs.readFileSync(file, "utf8"),
    path: file,
  });
}
module.exports = readVFile;
