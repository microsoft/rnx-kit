import { deepEqual, equal } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import type { Options } from "../src/checkForDuplicatePackages";
import {
  checkForDuplicateDependencies as checkForDuplicateDependenciesActual,
  checkForDuplicatePackages as checkForDuplicatePackagesActual,
  countCopies,
  detectDuplicatePackages,
  printModule,
} from "../src/checkForDuplicatePackages";
import * as mockfs from "./__mocks__/fs";
import {
  bundleGraph,
  bundleGraphFS,
  bundleGraphWithDuplicates,
  bundleGraphWithDuplicatesFS,
  bundleSourceMap,
  bundleSourceMapFS,
  bundleSourceMapWithDuplicates,
  bundleSourceMapWithDuplicatesFS,
} from "./testData";

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

function noop() {
  // intentionally empty
}

describe("countCopies()", () => {
  it("returns number of copies of a package", () => {
    equal(countCopies(testModuleMap["fbjs"]), 2);
    equal(countCopies(testModuleMap["metro"]), 2);
    equal(countCopies(testModuleMap["react-native"]), 1);
  });
});

describe("printModules()", () => {
  it("prints all versions and locations of a package", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);

    printModule(testModuleMap["fbjs"]);
    equal(warnMock.mock.callCount(), 2);
    warnMock.mock.resetCalls();

    printModule(testModuleMap["metro"]);
    equal(warnMock.mock.callCount(), 2);
    warnMock.mock.resetCalls();

    printModule(testModuleMap["react-native"]);
    equal(warnMock.mock.callCount(), 1);
    warnMock.mock.resetCalls();
  });
});

describe("detectDuplicatePackages()", () => {
  it("returns number of duplicated packages", () => {
    deepEqual(detectDuplicatePackages(testModuleMap, defaultOptions), {
      banned: 0,
      duplicates: 2,
    });
  });

  it("ignores specified packages", () => {
    deepEqual(
      detectDuplicatePackages(testModuleMap, { ignoredModules: ["fbjs"] }),
      { banned: 0, duplicates: 1 }
    );
    deepEqual(
      detectDuplicatePackages(testModuleMap, {
        ignoredModules: ["fbjs", "metro"],
      }),
      { banned: 0, duplicates: 0 }
    );
  });

  it("counts banned packages", () => {
    deepEqual(
      detectDuplicatePackages(testModuleMap, {
        bannedModules: ["react", "react-native"],
      }),
      { banned: 2, duplicates: 2 }
    );
  });

  it("prints the duplicated packages", (t) => {
    const errorMock = t.mock.method(console, "error", noop);
    const warnMock = t.mock.method(console, "warn", noop);

    detectDuplicatePackages(testModuleMap, defaultOptions);

    equal(errorMock.mock.callCount(), 2);
    equal(warnMock.mock.callCount(), 4);
  });
});

describe("checkForDuplicateDependencies()", () => {
  const checkForDuplicateDependencies: typeof checkForDuplicateDependenciesActual =
    (graph, options) =>
      checkForDuplicateDependenciesActual(graph, options, mockfs);

  afterEach(() => mockfs.__setMockFiles());

  it("checkForDuplicateDependencies", (t) => {
    const errorMock = t.mock.method(console, "error", noop);
    const warnMock = t.mock.method(console, "warn", noop);
    mockfs.__setMockFiles(bundleGraphFS);

    deepEqual(checkForDuplicateDependencies(bundleGraph), {
      banned: 0,
      duplicates: 0,
    });
    equal(errorMock.mock.callCount(), 0);
    equal(warnMock.mock.callCount(), 0);

    mockfs.__setMockFiles(bundleGraphWithDuplicatesFS);

    deepEqual(checkForDuplicateDependencies(bundleGraphWithDuplicates), {
      banned: 0,
      duplicates: 1,
    });
    equal(errorMock.mock.callCount(), 1);
    equal(warnMock.mock.callCount(), 2);
  });
});

describe("checkForDuplicatePackages()", () => {
  const checkForDuplicatePackages: typeof checkForDuplicatePackagesActual = (
    sourceMap,
    options
  ) => checkForDuplicatePackagesActual(sourceMap, options, mockfs);

  afterEach(() => mockfs.__setMockFiles());

  it("checkForDuplicatePackages", () => {
    mockfs.__setMockFiles(bundleSourceMapFS);

    deepEqual(checkForDuplicatePackages(bundleSourceMap), {
      banned: 0,
      duplicates: 0,
    });

    mockfs.__setMockFiles(bundleSourceMapWithDuplicatesFS);

    deepEqual(checkForDuplicatePackages(bundleSourceMapWithDuplicates), {
      banned: 0,
      duplicates: 1,
    });
  });
});
