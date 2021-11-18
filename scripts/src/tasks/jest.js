// @ts-check

const { argv, jestTask } = require("just-scripts");

/**
 * @returns {import("just-scripts").JestTaskOptions}
 */
function getJestOptions() {
  //  pass through everything but the "test" / "jest" task name
  const args = argv();
  for (const element of ["jest", "test"]) {
    const index = args._.indexOf(element);
    if (index !== -1) {
      args._.splice(index, 1);
    }
    if (element in args) {
      delete args[element];
    }
  }

  return {
    config: "jest.config.js",
    coverage: !!argv().production,
    runInBand: true,
    passWithNoTests: true,
    ...args,
  };
}

exports.jest = jestTask(getJestOptions());
