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

function scriptsDeps() {
  const config = require("rnx-kit-scripts/package.json");
  return Object.keys(config.dependencies);
}

function depcheckTask() {
  /**
   * @param {(err?: Error) => void} done
   */
  const task = function(done) {
    const { logger } = require("just-scripts");
    const depcheck = require("depcheck");
    const path = require("path");
    const config = require(path.join(process.cwd(), "package.json"));
    const options = mergeOneLevel(
      {
        ignorePatterns: ["*eslint*", "/lib/*", "/lib-commonjs/*"],
        ignoreMatches: ["rnx-kit-scripts", ...scriptsDeps()],
        specials: [
          depcheck.special.eslint,
          depcheck.special.webpack,
          depcheck.special.jest,
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
      } catch (error) {
        done(error);
      }
    });
  };
  return task;
}

module.exports.depcheck = depcheckTask;
