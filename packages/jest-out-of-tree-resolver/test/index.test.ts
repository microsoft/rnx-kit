import os from "os";
import path from "path";

function setFixture(name: string): void {
  process.chdir(path.join(__dirname, "__fixtures__", name));
}

describe("jest-out-of-tree-resolver", () => {
  const reactNativeMacOSPath =
    path.sep + path.join("__fixtures__", "react-native-macos", "index.js");
  const reactNativePath =
    path.sep + path.join("node_modules", "react-native", "index.js");
  const reactNativeWindowsLocalPath =
    path.sep + path.join("__fixtures__", "react-native-windows", "index.js");
  const reactNativeWindowsPath =
    path.sep + path.join("node_modules", "react-native-windows", "index.js");
  const reactPath = path.sep + path.join("node_modules", "react", "index.js");

  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const currentDir = process.cwd();

  afterEach(() => {
    consoleWarnSpy.mockReset();
    process.chdir(currentDir);
  });

  test("throws if no package root is found", () => {
    const root =
      os.platform() === "win32"
        ? currentDir.substr(0, currentDir.indexOf(path.sep) + 1)
        : "/";
    process.chdir(root);

    jest.isolateModules(() => {
      expect(() => require("../src/index")).toThrow();
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns `react-native` when no config is present", () => {
    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativePath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns `react-native` when platform config or override are missing", () => {
    setFixture("project-with-config");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativePath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("resolves to the package at `reactNativePath`", () => {
    setFixture("project-with-override");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeWindowsLocalPath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns the out-of-tree platform package when inside one", () => {
    setFixture("react-native-windows");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeWindowsPath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns the first package with `npmPackageName` defined", () => {
    setFixture("react-native-macos");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeMacOSPath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("warns if there are several platforms with `npmPackageName` defined", () => {
    setFixture("multi-platform");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeMacOSPath)
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });
});
