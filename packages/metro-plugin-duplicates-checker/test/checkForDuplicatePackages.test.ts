import {
  checkForDuplicateDependencies,
  checkForDuplicatePackages,
  countCopies,
  detectDuplicatePackages,
  Options,
  printDuplicates,
} from "../src/checkForDuplicatePackages";
import {
  bundleGraph,
  bundleGraphWithDuplicates,
  bundleSourceMap,
  bundleSourceMapWithDuplicates,
  repoRoot,
} from "./testData";

jest.mock("fs");
jest.mock("pkg-dir");

// Under normal circumstances, this extra copy of '@react-native/polyfills'
// should not be installed.
const extraPolyfills = `${repoRoot.replace(
  /\\/g,
  "/"
)}/packages/test-app/node_modules/@react-native/polyfills`;
require("pkg-dir").sync = jest.fn().mockImplementation((cwd) => {
  switch (cwd) {
    // Under normal circumstances, this extra copy of '@react-native/polyfills'
    // should not be installed.
    case `${extraPolyfills}/index.js`:
      return extraPolyfills;
    default:
      return jest.requireActual("pkg-dir").sync(cwd);
  }
});

const defaultOptions: Options = {
  ignoredModules: [],
  bannedModules: [],
};

const testModuleMap = {
  "@babel/runtime": {
    "7.13.10": new Set(["/~/node_modules/@babel/runtime"]),
  },
  fbjs: {
    "1.0.0": new Set([
      "/~/node_modules/fbjs",
      "/~/node_modules/react-native/node_modules/fbjs",
    ]),
  },
  metro: {
    "0.58.0": new Set(["/~/node_modules/metro"]),
    "0.59.0": new Set(["/~/node_modules/metro"]),
  },
  invariant: {
    "2.2.4": new Set(["/~/node_modules/invariant"]),
  },
  react: {
    "16.13.1": new Set(["/~/node_modules/react"]),
  },
  "react-native": {
    "0.63.4": new Set(["/~/node_modules/react-native"]),
  },
};

describe("countCopies()", () => {
  test("returns number of copies of a package", () => {
    expect(countCopies(testModuleMap["fbjs"])).toBe(2);
    expect(countCopies(testModuleMap["metro"])).toBe(2);
    expect(countCopies(testModuleMap["react-native"])).toBe(1);
  });
});

describe("printDuplicates()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("prints all versions and locations of a package", () => {
    printDuplicates(testModuleMap["fbjs"]);
    expect(consoleWarnSpy).toBeCalledTimes(2);
    consoleWarnSpy.mockReset();

    printDuplicates(testModuleMap["metro"]);
    expect(consoleWarnSpy).toBeCalledTimes(2);
    consoleWarnSpy.mockReset();

    printDuplicates(testModuleMap["react-native"]);
    expect(consoleWarnSpy).toBeCalledTimes(1);
    consoleWarnSpy.mockReset();
  });
});

describe("detectDuplicatePackages()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns number of duplicated packages", () => {
    expect(detectDuplicatePackages(testModuleMap, defaultOptions)).toBe(2);
  });

  test("ignores specified packages", () => {
    expect(
      detectDuplicatePackages(testModuleMap, { ignoredModules: ["fbjs"] })
    ).toBe(1);
    expect(
      detectDuplicatePackages(testModuleMap, {
        ignoredModules: ["fbjs", "metro"],
      })
    ).toBe(0);
  });

  test("counts banned packages", () => {
    expect(
      detectDuplicatePackages(testModuleMap, {
        bannedModules: ["react", "react-native"],
      })
    ).toBe(4);
  });

  test("prints the duplicated packages", () => {
    detectDuplicatePackages(testModuleMap, defaultOptions);
    expect(consoleErrorSpy).toBeCalledTimes(2);
    expect(consoleWarnSpy).toBeCalledTimes(4);
  });
});

describe("checkForDuplicateDependencies()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("checkForDuplicateDependencies", () => {
    expect(checkForDuplicateDependencies(bundleGraph)).toBe(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    expect(checkForDuplicateDependencies(bundleGraphWithDuplicates)).toBe(1);
    expect(consoleErrorSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledTimes(2);
  });
});

describe("checkForDuplicatePackages()", () => {
  test("checkForDuplicatePackages", () => {
    expect(checkForDuplicatePackages(bundleSourceMap)).toBe(0);
    expect(checkForDuplicatePackages(bundleSourceMapWithDuplicates)).toBe(1);
  });
});
