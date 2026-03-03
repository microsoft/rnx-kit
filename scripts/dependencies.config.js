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
  return (
    Object.hasOwn(manifest, "jest") ||
    fs.existsSync(path.join(cwd, "jest.config.js"))
  );
}

/**
 * @param {string} _cwd
 * @param {Record<string, Record<string, string>>} manifest
 * @returns {boolean}
 */
function needsLint(_cwd, manifest) {
  return (
    Object.hasOwn(manifest, "scripts") &&
    Object.hasOwn(manifest["scripts"], "lint") &&
    manifest["scripts"]["lint"].includes("rnx-kit-scripts lint")
  );
}

const needsTypeScript = lookForFile("tsconfig.json");

const COMMON_DEPENDENCIES = /** @type {const} */ ([
  ["@types/jest", needsJest],
  ["@typescript/native-preview", needsTypeScript],
  ["oxlint", needsLint],
  ["jest", needsJest],
  ["oxfmt", always],
  ["typescript", needsTypeScript],
]);

/* oxlint-disable-next-line no-default-export */
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
