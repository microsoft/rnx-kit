import { argv, jestTask, JestTaskOptions } from "just-scripts";

function getJestOptions(): JestTaskOptions {
  const updateSnapshot =
    argv().u || argv().updateSnapshot ? { updateSnapshot: true } : undefined;
  return {
    config: "jest.config.js",
    coverage: !!argv().production,
    runInBand: true,
    passWithNoTests: true,
    ...updateSnapshot,
  };
}

export const jest = jestTask(getJestOptions());
