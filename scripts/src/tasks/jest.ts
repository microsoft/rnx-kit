import { argv, jestTask, JestTaskOptions } from "just-scripts";

function getJestOptions(): JestTaskOptions {
  //  pass through everything but the "test" / "jest" task name
  const args = argv();
  for (const element of ["jest", "test"]) {
    const index = args._.indexOf(element);
    if (index !== -1) {
      args._.splice(index, 1);
    }
    if (args.hasOwnProperty(element)) {
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

export const jest = jestTask(getJestOptions());
