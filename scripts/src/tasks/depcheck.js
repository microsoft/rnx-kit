// @ts-check

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

function depcheckTask() {
  /**
   * @param {(err?: Error) => void} done
   */
  const task = function (done) {
    const { logger } = require("just-scripts");
    const depcheck = require("depcheck");
    const path = require("path");
    const config = require(path.join(process.cwd(), "package.json"));
    const options = mergeOneLevel(
      {
        ignorePatterns: ["/lib/*", "/lib-commonjs/*"],
        ignoreMatches: ["@rnx-kit/eslint-config", "@rnx-kit/scripts"],
        specials: [
          depcheck.special.babel,
          depcheck.special.eslint,
          depcheck.special.jest,
          depcheck.special.prettier,
        ],
      },
      config.depcheck
    );

    return depcheck(process.cwd(), options, (result) => {
      try {
        if (result.devDependencies.length > 0) {
          logger.warn("Unused devDependencies");
          result.devDependencies.forEach((dependency) => {
            logger.warn(`-- ${dependency}`);
          });
        }
        if (
          result.dependencies.length > 0 ||
          Object.keys(result.missing).length > 0
        ) {
          if (result.dependencies.length > 0) {
            logger.error("Unused dependencies");
            result.dependencies.forEach((dependency) => {
              logger.error(`-- ${dependency}`);
            });
          }

          Object.keys(result.missing).forEach((dependency) => {
            logger.error(`Missing dependency on ${dependency}`);
            result.missing[dependency].forEach((file) => {
              logger.error(`-- ${file}`);
            });
          });

          throw "Dependency checking failed";
        }
      } catch (err) {
        if (err instanceof Error) {
          done(err);
        } else {
          throw err;
        }
      }
    });
  };
  return task;
}

module.exports.depcheck = depcheckTask;
