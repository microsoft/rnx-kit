import { argv, jestTask, JestTaskOptions } from "just-scripts";
import { AllPlatforms } from "./metro";

function createJestTask(
  options: JestTaskOptions,
  platform: AllPlatforms | undefined
) {
  const config = platform ? `jest.config.${platform}.js` : "jest.config.js";
  return jestTask({ ...options, config: config });
}

function getJestOptions(): JestTaskOptions {
  const updateSnapshot =
    argv().u || argv().updateSnapshot ? { updateSnapshot: true } : undefined;
  return {
    coverage: !!argv().production,
    runInBand: true,
    passWithNoTests: true,
    ...updateSnapshot,
  };
}

export const jest = {
  default: () => {
    const options = getJestOptions();
    return createJestTask(options, undefined);
  },
  ios: () => {
    const options = getJestOptions();
    return createJestTask(options, "ios");
  },
  android: () => {
    const options = getJestOptions();
    return createJestTask(options, "android");
  },
  macos: () => {
    const options = getJestOptions();
    return createJestTask(options, "macos");
  },
  windows: () => {
    const options = getJestOptions();
    return createJestTask(options, "windows");
  },
};
