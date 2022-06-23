#!/usr/bin/env node
// @ts-check

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * @param {string} filename
 * @param {string=} algorithm
 * @returns {string}
 */
function hashFile(filename, algorithm = "sha256") {
  const data = readFileSync(filename, { encoding: "utf-8" }).replace(/\r/g, "");
  return createHash(algorithm).update(data).digest("hex");
}

const { [2]: filename } = process.argv;
console.log(hashFile(filename));
