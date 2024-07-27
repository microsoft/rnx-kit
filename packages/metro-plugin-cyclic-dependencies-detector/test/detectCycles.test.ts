import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CyclicDependencies } from "../src/detectCycles";
import { detectCycles, traverseDependencies } from "../src/detectCycles";
import {
  entryPoint,
  graphWithCycles,
  graphWithNoCycles,
  repoRoot,
} from "./testData";

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

function stripRepoRootFromPaths(
  cyclicDependencies: CyclicDependencies
): CyclicDependencies {
  const token = "/~";
  return Object.entries(cyclicDependencies).reduce<CyclicDependencies>(
    (cyclicDependencies, [modulePath, importPath]) => {
      cyclicDependencies[modulePath.replace(repoRoot, token)] = importPath.map(
        (p) => p.replace(repoRoot, token)
      );
      return cyclicDependencies;
    },
    {}
  );
}

describe("traverseDependencies()", () => {
  it("returns nothing if there are no cycles", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithNoCycles().dependencies,
      {}
    );
    deepEqual(cyclicDependencies, {});
  });

  it("returns import paths causing a cycle", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithCycles().dependencies,
      {}
    );

    deepEqual(stripRepoRootFromPaths(cyclicDependencies), {
      "/~/packages/test-app/lib/src/App.js": [
        "/~/packages/test-app/lib/src/index.js",
        "/~/packages/test-app/lib/src/App.js",
        "/~/packages/test-app/lib/src/cyclicExample.js",
      ],
    });
  });

  it("returns cycles in `node_modules`", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithCycles().dependencies,
      { includeNodeModules: true }
    );

    deepEqual(stripRepoRootFromPaths(cyclicDependencies), {
      "/~/node_modules/react-native/index.js": [
        "/~/packages/test-app/lib/src/index.js",
        "/~/node_modules/react-native/index.js",
        "/~/node_modules/react-native/Libraries/ReactNative/AppRegistry.js",
        "/~/node_modules/react-native/Libraries/LogBox/LogBoxInspectorContainer.js",
      ],
      "/~/packages/test-app/lib/src/App.js": [
        "/~/packages/test-app/lib/src/index.js",
        "/~/packages/test-app/lib/src/App.js",
        "/~/packages/test-app/lib/src/cyclicExample.js",
      ],
    });
  });
});

describe("detectCycles()", () => {
  it("prints nothing if all is fine", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithNoCycles(), {});

    equal(warnMock.mock.calls.length, 0);
    equal(errorMock.mock.calls.length, 0);
  });

  it("prints if cycles are found in `node_modules`", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithNoCycles(), {
      includeNodeModules: true,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 5);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), { throwOnError: false });

    equal(warnMock.mock.calls.length, 4);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle, including `node_modules`", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 9);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle with 0 context", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), {
      linesOfContext: 0,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 3);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle with 0 context, including `node_modules`", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      linesOfContext: 0,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 7);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle with more context", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), {
      linesOfContext: 10,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 4);
    equal(errorMock.mock.calls.length, 1);
  });

  it("prints import paths causing a cycle with more context, including `node_modules`", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      linesOfContext: 10,
      throwOnError: false,
    });

    equal(warnMock.mock.calls.length, 9);
    equal(errorMock.mock.calls.length, 1);
  });

  it("throws on cycle detection by default", (t) => {
    const warnMock = t.mock.method(console, "warn", noop);
    const errorMock = t.mock.method(console, "error", noop);

    throws(
      () => detectCycles(entryPoint, graphWithCycles(), {}),
      new Error("Import cycles detected")
    );
    equal(warnMock.mock.calls.length, 4);
    equal(errorMock.mock.calls.length, 0);
  });
});
