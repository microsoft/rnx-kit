// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @typedef {{
 *   scripts?: Record<string, string>;
 *   dependencies?: Record<string, string>;
 *   jest?: unknown;
 * }} Manifest;
 */

/**
 * @returns {true}
 */
function always() {
  return true;
}

/**
 * @template {object} T
 * @template {keyof T} K
 * @param {T} obj
 * @param {K} property
 * @returns {obj is T & Pick<Required<T>, K>}
 */
function hasOwn(obj, property) {
  return Object.hasOwn(obj, property);
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
 * @param {Manifest} manifest
 * @returns {boolean}
 */
function needsJest(cwd, manifest) {
  return (
    hasOwn(manifest, "jest") || fs.existsSync(path.join(cwd, "jest.config.js"))
  );
}

/**
 * @param {string} _cwd
 * @param {Manifest} manifest
 * @returns {boolean}
 */
function needsLint(_cwd, manifest) {
  return (
    hasOwn(manifest, "scripts") &&
    hasOwn(manifest["scripts"], "lint") &&
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

/**
 * @param {{ cwd: string; manifest: Manifest; }}
 */
export default function ({ cwd, manifest }) {
  /** @type {Pick<Required<Manifest>, "dependencies"> | undefined} */
  let extensions = undefined;

  for (const [pkg, test] of COMMON_DEPENDENCIES) {
    if (test(cwd, manifest)) {
      extensions ||= { dependencies: {} };
      extensions.dependencies[pkg] = "catalog:";
    }
  }

  return extensions;
}
