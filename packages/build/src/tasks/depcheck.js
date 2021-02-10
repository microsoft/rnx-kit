function mergeOneLevel(a, b = {}) {
  const result = { ...a, ...b };
  Object.keys(a).forEach((key) => {
    if (Array.isArray(b[key]) && Array.isArray(a[key])) {
      result[key] = [].concat(a[key], b[key]);
    }
  });
  return result;
}

function scriptsDevDeps() {
  const config = require("@rnx-kit/build/package.json");
  return Object.keys(config.devDependencies);
}

function depcheckTask() {
  return function(done) {
    const { logger } = require("just-scripts");
    const depcheck = require("depcheck");
    const path = require("path");
    const config = require(path.join(process.cwd(), "package.json"));
    const options = mergeOneLevel(
      {
        ignorePatterns: ["*eslint*", "/lib/*", "/lib-commonjs/*"],
        ignoreMatches: ["@rnx-kit/build", ...scriptsDevDeps()],
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
}

module.exports.depcheck = depcheckTask;
