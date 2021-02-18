import { argv, jestTask } from "just-scripts";

function createJestTask(options, platform) {
  const config = platform ? `jest.config.${platform}.js` : "jest.config.js";
  return jestTask({ ...options, config: config });
}

function getJestOptions() {
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
  win32: () => {
    const options = getJestOptions();
    return createJestTask(options, "win32");
  },
  windows: () => {
    const options = getJestOptions();
    return createJestTask(options, "windows");
  },
};
