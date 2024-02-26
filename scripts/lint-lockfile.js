import yaml from "js-yaml";
import * as fs from "node:fs";

const yml = fs.readFileSync("yarn.lock", { encoding: "utf-8" });
const lockfile = /** @type {Record<string, Record<string, string>>} */ (yaml.load(yml));
for (const [key, pkg] of Object.entries(lockfile)) {
  if (key.includes("@rnx-kit") && pkg.version !== "0.0.0-use.local") {
    throw new Error(`${key}: resolved to npm:${pkg.version}`);
  }
}
