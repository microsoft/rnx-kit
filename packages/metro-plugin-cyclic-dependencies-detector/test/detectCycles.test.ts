import {
  CyclicDependencies,
  detectCycles,
  traverseDependencies,
} from "../src/detectCycles";
import {
  entryPoint,
  graphWithCycles,
  graphWithNoCycles,
  repoRoot,
} from "./testData";

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
  test("returns nothing if there are no cycles", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithNoCycles().dependencies,
      {}
    );
    expect(cyclicDependencies).toEqual({});
  });

  test("returns import paths causing a cycle", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithCycles().dependencies,
      {}
    );
    expect(stripRepoRootFromPaths(cyclicDependencies)).toMatchSnapshot();
  });

  test("returns cycles in `node_modules`", () => {
    const cyclicDependencies = traverseDependencies(
      entryPoint,
      graphWithCycles().dependencies,
      { includeNodeModules: true }
    );
    expect(stripRepoRootFromPaths(cyclicDependencies)).toMatchSnapshot();
  });
});

describe("detectCycles()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleLogSpy = jest.spyOn(global.console, "log");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    consoleLogSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("prints nothing if all is fine", () => {
    detectCycles(entryPoint, graphWithNoCycles(), {});
    expect(consoleWarnSpy).not.toBeCalled();
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("prints if cycles are found in `node_modules`", () => {
    detectCycles(entryPoint, graphWithNoCycles(), {
      includeNodeModules: true,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(5);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle", () => {
    detectCycles(entryPoint, graphWithCycles(), { throwOnError: false });
    expect(consoleWarnSpy).toBeCalledTimes(4);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle, including `node_modules`", () => {
    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(9);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle with 0 context", () => {
    detectCycles(entryPoint, graphWithCycles(), {
      linesOfContext: 0,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(3);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle with 0 context, including `node_modules`", () => {
    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      linesOfContext: 0,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(7);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle with more context", () => {
    detectCycles(entryPoint, graphWithCycles(), {
      linesOfContext: 10,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(4);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("prints import paths causing a cycle with more context, including `node_modules`", () => {
    detectCycles(entryPoint, graphWithCycles(), {
      includeNodeModules: true,
      linesOfContext: 10,
      throwOnError: false,
    });
    expect(consoleWarnSpy).toBeCalledTimes(9);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("throws on cycle detection by default", () => {
    expect(() => detectCycles(entryPoint, graphWithCycles(), {})).toThrow(
      "Import cycles detected"
    );
    expect(consoleWarnSpy).toBeCalledTimes(4);
    expect(consoleErrorSpy).not.toBeCalled();
  });
});
