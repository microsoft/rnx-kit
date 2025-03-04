// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";

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

const COMMON_DEPENDENCIES = /** @type {const} */ ([
  ["@types/jest", needsJest],
  ["eslint", lookForFile("eslint.config.js")],
  ["jest", needsJest],
  ["prettier", always],
  ["typescript", lookForFile("tsconfig.json")],
]);

/** @type {(name: string) => string | undefined} */
const getDependencyVersion = (() => {
  let dependencies;
  let devDependencies;
  return (name) => {
    if (!dependencies) {
      const url = new URL("package.json", import.meta.url);
      const manifest = JSON.parse(fs.readFileSync(url, { encoding: "utf-8" }));
      dependencies = manifest["dependencies"] ?? {};
      devDependencies = manifest["devDependencies"] ?? {};
    }

    return devDependencies[name] || dependencies[name];
  };
})();

/* eslint-disable-next-line no-restricted-exports */
export default function ({ cwd, manifest }) {
  let extensions = undefined;

  for (const [pkg, test] of COMMON_DEPENDENCIES) {
    if (test(cwd, manifest)) {
      extensions ||= { dependencies: {} };
      extensions.dependencies[pkg] = getDependencyVersion(pkg);
    }
  }

  return extensions;
}
