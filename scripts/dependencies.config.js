// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @returns {true}
 */
function always() {
  return true;
}

/**
 * @param {string} filename
 * @returns {(cwd: string) => boolean}
 */
function lookForFile(filename) {
  return (cwd) => fs.existsSync(path.join(cwd, filename));
}

/**
 * @param {string} cwd
 * @param {Record<string, unknown>} manifest
 * @returns {boolean}
 */
function needsJest(cwd, manifest) {
  return "jest" in manifest || fs.existsSync(path.join(cwd, "jest.config.js"));
}

const needsTypeScript = lookForFile("tsconfig.json");

const COMMON_DEPENDENCIES = /** @type {const} */ ([
  ["@types/jest", needsJest],
  ["@typescript/native-preview", needsTypeScript],
  ["eslint", lookForFile("eslint.config.js")],
  ["jest", needsJest],
  ["prettier", always],
  ["typescript", needsTypeScript],
]);

/* eslint-disable-next-line no-restricted-exports */
export default function ({ cwd, manifest }) {
  let extensions = undefined;

  for (const [pkg, test] of COMMON_DEPENDENCIES) {
    if (test(cwd, manifest)) {
      extensions ||= { dependencies: {} };
      extensions.dependencies[pkg] = "catalog:";
    }
  }

  return extensions;
}
