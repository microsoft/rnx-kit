// @ts-check

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @param {{ [key: string]: unknown }} a
 * @param {{ [key: string]: unknown }} b
 */
function mergeOneLevel(a, b = {}) {
  const result = { ...a, ...b };
  Object.keys(a).forEach((key) => {
    const val_a = a[key];
    const val_b = b[key];
    if (Array.isArray(val_b) && Array.isArray(val_a)) {
      result[key] = [...val_a, ...val_b];
    }
  });
  return result;
}

export async function depcheck() {
  const { default: depcheck } = await import("depcheck");

  return new Promise((resolve, reject) => {
    const packageJson = path.join(process.cwd(), "package.json");
    const json = fs.readFileSync(packageJson, { encoding: "utf-8" });
    const config = JSON.parse(json);
    const options = mergeOneLevel(
      {
        ignorePatterns: ["/lib/*"],
        ignoreMatches: [
          "@rnx-kit/eslint-config",
          "@rnx-kit/jest-preset",
          "@rnx-kit/scripts",
          "@types/*",
          "eslint",
          "jest",
          "nx",
          "prettier",
          "typescript",
        ],
        specials: [
          depcheck.special.babel,
          depcheck.special.eslint,
          depcheck.special.jest,
          depcheck.special.prettier,
        ],
      },
      config.depcheck
    );

    /** @type {(name: string) => string} */
    const dependencyListing = (name) => "* " + name;

    depcheck(process.cwd(), options, (result) => {
      /** @type {string[]} */
      const warnings = [];
      if (result.devDependencies.length > 0) {
        warnings.push(
          "Unused devDependencies",
          ...result.devDependencies.map(dependencyListing)
        );
      }

      /** @type {string[]} */
      const errors = [];
      if (result.dependencies.length > 0) {
        errors.push(
          "Unused dependencies",
          ...result.dependencies.map(dependencyListing)
        );
      }

      const missing = Object.keys(result.missing);
      if (missing.length > 0) {
        errors.push(
          "Missing dependencies",
          ...missing.map(
            (dependency) =>
              `* ${dependency}: ${result.missing[dependency]
                .map((p) => path.relative(process.cwd(), p))
                .join(", ")}`
          )
        );
      }

      if (warnings.length > 0) {
        console.warn(warnings.join("\n"));
      }

      if (errors.length > 0) {
        console.error(errors.join("\n"));
        if (config.name === "@rnx-kit/test-app") {
          // The test app is the only exception to allow free experimentation
          resolve(0);
        } else {
          reject(new Error("Dependency check failed"));
        }
      } else {
        resolve(0);
      }
    });
  });
}
