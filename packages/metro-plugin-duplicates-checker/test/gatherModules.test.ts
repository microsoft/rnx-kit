import {
  gatherModulesFromGraph,
  gatherModulesFromSourceMap,
  gatherModulesFromSources,
  normalizePath,
  resolveModule,
} from "../src/gatherModules";
import {
  bundleGraph,
  bundleGraphFS,
  bundleSourceMap,
  bundleSourceMapFS,
} from "./testData";

jest.mock("fs");

describe("normalizePath()", () => {
  test("trims Webpack URLs", () => {
    expect(normalizePath("webpack:///file")).toBe("file");
    expect(normalizePath("webpack:////file")).toBe("/file");
  });

  test("handles Windows paths", () => {
    expect(normalizePath("C:\\Users\\Arnold\\source\\rnx-kit")).toBe(
      "C:/Users/Arnold/source/rnx-kit"
    );
  });
});

describe("resolveModule()", () => {
  test("throws if a package is not found", () => {
    expect(() => resolveModule("/this-package-does-not-exist")).toThrow(
      "Unable to resolve module"
    );
  });
});

describe("gatherModulesFromGraph()", () => {
  const fs = require("fs");

  afterAll(() => fs.__setMockFiles());

  test("builds module map from a basic source map", () => {
    fs.__setMockFiles(bundleGraphFS);

    const modules = gatherModulesFromGraph(bundleGraph, {});

    expect(Object.keys(modules).sort()).toEqual(["react-native"]);
  });
});

describe("gatherModulesFromSourceMap()", () => {
  const fs = require("fs");

  afterAll(() => fs.__setMockFiles());

  test("builds module map from a basic source map", () => {
    fs.__setMockFiles(bundleSourceMapFS);

    const modules = gatherModulesFromSources(bundleSourceMap.sources, {});

    expect(Object.keys(modules).sort()).toEqual([
      "@babel/runtime",
      "abort-controller",
      "anser",
      "base64-js",
      "event-target-shim",
      "invariant",
      "metro",
      "nullthrows",
      "object-assign",
      "pretty-format",
      "promise",
      "prop-types",
      "react",
      "react-devtools-core",
      "react-is",
      "react-native",
      "react-refresh",
      "regenerator-runtime",
      "scheduler",
      "stacktrace-parser",
      "whatwg-fetch",
    ]);

    Object.keys(modules).forEach((name) => {
      expect(Object.keys(modules[name]).length).toBe(1);
    });

    expect(gatherModulesFromSourceMap(bundleSourceMap, {})).toEqual(modules);
  });
});
