// @ts-check

const { logger } = require("just-task");
const { findGitRoot, getPackageInfos } = require("workspace-tools");

/**
 * @typedef {"dependencies" | "devDependencies" | "peerDependencies"} DependencyType
 *
 * @typedef {{
 *   dependencyTypes?: DependencyType[];
 * }} CheckPublishingOptions
 */

/**
 * Task to check the matrix of packages for publishing errors. In particular
 * this checks for published packages that have a dependency on a private
 * package.
 *
 * @param {CheckPublishingOptions=} options - options for configuring the task
 * @returns {import("just-task").TaskFunction}
 */
function checkPublishingTask(options = {}) {
  const dependencyTypes = options.dependencyTypes || ["dependencies"];

  /** @type {(done: (error?: Error) => void) => void} */
  return (done) => {
    const gitRoot = findGitRoot(process.cwd());
    if (!gitRoot) {
      throw `Cannot located Git root from ${process.cwd()}`;
    }
    const packageInfos = getPackageInfos(gitRoot);
    logger.info("Starting scan for publishing errors");
    try {
      Object.keys(packageInfos).forEach((pkg) => {
        if (!packageInfos[pkg].private) {
          logger.verbose(
            `Scanning published package ${pkg} for private dependenies`
          );
          dependencyTypes.forEach((dependencyType) => {
            const deps = packageInfos[pkg][dependencyType];
            Object.keys(deps || {}).forEach((dep) => {
              if (packageInfos[dep] && packageInfos[dep].private) {
                const errorMsg = `${pkg} has a ${dependencyType} on private package ${dep}`;
                logger.error(errorMsg);
                throw errorMsg;
              }
            });
          });
        }
      });
    } catch (err) {
      if (err instanceof Error) {
        done(err);
      } else {
        throw err;
      }
    }
    logger.info("No publishing errors found");
    done();
  };
}

exports.checkPublishingTask = checkPublishingTask;
