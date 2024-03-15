// @ts-check
import yaml from "js-yaml";
import * as fs from "node:fs";

const yml = fs.readFileSync("yarn.lock", { encoding: "utf-8" });
const lockfile = /** @type {Record<string, Record<string, string>>} */ (
  yaml.load(yml)
);
process.exitCode = Object.entries(lockfile).reduce((error, [key, pkg]) => {
  if (key.includes("@rnx-kit") && pkg.version !== "0.0.0-use.local") {
    console.error(`${key}: resolved to npm:${pkg.version}`);
    return error + 1;
  } else {
    return error;
  }
}, 0);
