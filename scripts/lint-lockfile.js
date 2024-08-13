// @ts-check
import yaml from "js-yaml";
import * as fs from "node:fs";

/**
 * @param {string} key
 * @param {Record<string, string>} pkg
 * @return {boolean}
 */
function shouldUseLocalPackage(key, pkg) {
  if (key.includes("@rnx-kit/chromium-edge-launcher")) {
    // This package has been removed because the changes have been upstreamed
    return false;
  }

  return key.includes("@rnx-kit") && pkg.version !== "0.0.0-use.local";
}

const lockfile = /** @type {Record<string, Record<string, string>>} */ (
  yaml.load(fs.readFileSync("yarn.lock", { encoding: "utf-8" }))
);
process.exitCode = Object.entries(lockfile).reduce((error, [key, pkg]) => {
  if (shouldUseLocalPackage(key, pkg)) {
    console.error(`${key}: resolved to npm:${pkg.version}`);
    return error + 1;
  } else {
    return error;
  }
}, 0);
