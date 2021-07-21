import os from "os";
import path from "path";

function setFixture(name: string): void {
  process.chdir(path.join(__dirname, "__fixtures__", name));
}

describe("jest-resolver", () => {
  const reactNativePath =
    path.sep + path.join("node_modules", "react-native", "index.js");
  const reactNativeMacOSPath =
    path.sep + path.join("__fixtures__", "react-native-macos", "index.js");
  const reactNativeWindowsPath =
    path.sep + path.join("__fixtures__", "react-native-windows", "index.js");
  const reactPath = path.sep + path.join("node_modules", "react", "index.js");

  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const currentDir = process.cwd();

  afterEach(() => {
    consoleWarnSpy.mockReset();
    process.chdir(currentDir);
    delete process.env["RN_TARGET_PLATFORM"];
  });

  test("throws if no package root is found", () => {
    const root =
      os.platform() === "win32"
        ? currentDir.substr(0, currentDir.indexOf(path.sep) + 1)
        : "/";
    process.chdir(root);

    jest.isolateModules(() => {
      expect(() => require("../src/index")).toThrowError(
        "Failed to resolve current package root"
      );
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns path when no config is present", () => {
    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native", {})).toEqual(
        expect.stringContaining(reactNativePath)
      );
      expect(jestResolver("react", {})).toEqual(
        expect.stringContaining(reactPath)
      );
    });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns path when platform config or override are missing", () => {
    setFixture("project-with-config");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native", {})).toEqual(
        expect.stringContaining(reactNativePath)
      );
      expect(jestResolver("react", {})).toEqual(
        expect.stringContaining(reactPath)
      );
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  test("resolves to the package at `reactNativePath`", () => {
    setFixture("project-with-override");

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");

      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeWindowsPath)
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
        expect.stringContaining(
          path.sep + path.join("__fixtures__", "multi-platform", "index.js")
        )
      );
      expect(jestResolver("react")).toEqual(expect.stringContaining(reactPath));
    });

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  test("throws if an unknown platform is targeted", () => {
    const targetPlatform = "nextstep";
    process.env["RN_TARGET_PLATFORM"] = targetPlatform;

    jest.isolateModules(() => {
      expect(() => require("../src/index")).toThrowError(
        `'${targetPlatform}' was not found`
      );
    });
  });

  test("returns path for a core platform", () => {
    setFixture("multi-platform");

    process.env["RN_TARGET_PLATFORM"] = "ios";

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");
      expect(jestResolver("react", {})).toEqual(
        expect.stringContaining(reactPath)
      );
      expect(jestResolver("react-native", {})).toEqual(
        expect.stringContaining(reactNativePath)
      );
    });
  });

  test("returns path for an out-of-tree platform", () => {
    setFixture("multi-platform");

    process.env["RN_TARGET_PLATFORM"] = "macos";

    jest.isolateModules(() => {
      const jestResolver = require("../src/index");
      expect(jestResolver("react", {})).toEqual(
        expect.stringContaining(reactPath)
      );
      expect(jestResolver("react-native")).toEqual(
        expect.stringContaining(reactNativeMacOSPath)
      );
    });
  });
});
