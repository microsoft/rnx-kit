import { deepEqual, equal, throws } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  gatherModulesFromGraph as gatherModulesFromGraphActual,
  gatherModulesFromSourceMap as gatherModulesFromSourceMapActual,
  gatherModulesFromSources as gatherModulesFromSourcesActual,
  normalizePath,
  resolveModule as resolveModuleActual,
} from "../src/gatherModules.ts";
import mockfs from "./__mocks__/fs.js";
import {
  bundleGraph,
  bundleGraphFS,
  bundleSourceMap,
  bundleSourceMapFS,
} from "./testData.ts";

describe("normalizePath()", () => {
  it("trims Webpack URLs", () => {
    equal(normalizePath("webpack:///file"), "file");
    equal(normalizePath("webpack:////file"), "/file");
  });

  it("handles Windows paths", () => {
    equal(
      normalizePath("C:\\Users\\Arnold\\source\\rnx-kit"),
      "C:/Users/Arnold/source/rnx-kit"
    );
  });
});

describe("resolveModule()", () => {
  const resolveModule: typeof resolveModuleActual = (path) =>
    resolveModuleActual(path, mockfs);

  it("throws if a package is not found", () => {
    throws(
      () => resolveModule("/this-package-does-not-exist"),
      "Unable to resolve module"
    );
  });
});

describe("gatherModulesFromGraph()", () => {
  const gatherModulesFromGraph: typeof gatherModulesFromGraphActual = (
    graph,
    moduleMap
  ) => gatherModulesFromGraphActual(graph, moduleMap, mockfs);

  afterEach(() => mockfs.__setMockFiles());

  it("builds module map from a basic source map", () => {
    mockfs.__setMockFiles(bundleGraphFS);

    const modules = gatherModulesFromGraph(bundleGraph, {}, mockfs);

    deepEqual(Object.keys(modules).sort(), ["react-native"]);
  });
});

describe("gatherModulesFromSourceMap()", () => {
  const gatherModulesFromSourceMap: typeof gatherModulesFromSourceMapActual = (
    sourceMap,
    moduleMap
  ) => gatherModulesFromSourceMapActual(sourceMap, moduleMap, mockfs);

  const gatherModulesFromSources: typeof gatherModulesFromSourcesActual = (
    sources,
    moduleMap
  ) => gatherModulesFromSourcesActual(sources, moduleMap, mockfs);

  afterEach(() => mockfs.__setMockFiles());

  it("builds module map from a basic source map", () => {
    mockfs.__setMockFiles(bundleSourceMapFS);

    const modules = gatherModulesFromSources(bundleSourceMap.sources, {});

    deepEqual(Object.keys(modules).sort(), [
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

    for (const name of Object.keys(modules)) {
      equal(Object.keys(modules[name]).length, 1);
    }

    deepEqual(gatherModulesFromSourceMap(bundleSourceMap, {}), modules);
  });
});
