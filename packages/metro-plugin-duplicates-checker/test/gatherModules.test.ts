import {
  gatherModulesFromGraph,
  gatherModulesFromSourceMap,
  gatherModulesFromSources,
  normalizePath,
  resolveModule,
} from "../src/gatherModules";
import { bundleGraph, bundleSourceMap } from "./testData";

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
      "Unable to find package"
    );
  });
});

describe("gatherModulesFromGraph()", () => {
  test("builds module map from a basic source map", () => {
    const modules = gatherModulesFromGraph(bundleGraph, {});
    expect(Object.keys(modules).sort()).toMatchSnapshot();
  });
});

describe("gatherModulesFromSourceMap()", () => {
  test("builds module map from a basic source map", () => {
    const modules = gatherModulesFromSources(bundleSourceMap.sources, {});

    expect(Object.keys(modules).sort()).toMatchSnapshot();

    Object.keys(modules).forEach((name) => {
      expect(Object.keys(modules[name]).length).toBe(1);
    });

    expect(gatherModulesFromSourceMap(bundleSourceMap, {})).toEqual(modules);
  });
});
