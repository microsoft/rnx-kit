// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @typedef {{
 *   scripts?: Record<string, string>;
 *   dependencies?: Record<string, string>;
 *   peerDependencies?: Record<string, string>;
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

/**
 * @param {string} cwd
 * @param {Manifest} manifest
 * @returns {boolean | string}
 */
function needsTypeScript(cwd, manifest) {
  const compat = "catalog:compat";
  const { dependencies, peerDependencies } = manifest;
  if (dependencies && hasOwn(dependencies, "typescript-eslint")) {
    return compat;
  }
  if (peerDependencies && hasOwn(peerDependencies, "typescript")) {
    return compat;
  }

  return fs.existsSync(path.join(cwd, "tsconfig.json"));
}

const COMMON_DEPENDENCIES = /** @type {const} */ ([
  ["@types/jest", needsJest],
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
    const result = test(cwd, manifest);
    if (result) {
      extensions ||= { dependencies: {} };
      extensions.dependencies[pkg] ??=
        typeof result === "string" ? result : "catalog:";
    }
  }

  return extensions;
}
