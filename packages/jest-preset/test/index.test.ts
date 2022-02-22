import os from "os";
import path from "path";
import jestPreset from "../src/index";

function setFixture(name: string): void {
  process.chdir(path.join(__dirname, "__fixtures__", name));
}

describe("jest-preset", () => {
  const reactNativePath = path.sep + path.join("node_modules", "react-native");
  const reactNativeMacOSPath =
    path.sep + path.join("__fixtures__", "react-native-macos");
  const reactNativeMultiPlatformPath =
    path.sep + path.join("__fixtures__", "multi-platform");
  const reactNativeWindowsPath =
    path.sep + path.join("__fixtures__", "react-native-windows");

  const jestIOSPreset = {
    haste: {
      defaultPlatform: "ios",
      platforms: ["ios", "native"],
    },
    moduleNameMapper: {},
    setupFiles: [
      expect.stringContaining(path.join(reactNativePath, "jest", "setup.js")),
    ],
    transform: {
      "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": expect.stringContaining(
        path.join(reactNativePath, "jest", "assetFileTransformer.js")
      ),
      "react-native.*\\.jsx?$": [
        expect.stringContaining("babel-jest"),
        {
          presets: ["module:metro-react-native-babel-preset"],
        },
      ],
      "\\.[jt]sx?$": [
        expect.stringMatching(/@swc[/\\]jest/),
        { jsc: { target: "es2022" } },
      ],
    },
  };

  const jestMacOSPreset = (reactNativeMacOSPath: string) => ({
    haste: {
      defaultPlatform: "macos",
      platforms: ["macos", "native"],
    },
    moduleNameMapper: {
      "^react-native$": expect.stringContaining(reactNativeMacOSPath),
      "^react-native/(.*)": expect.stringContaining(
        path.join(reactNativeMacOSPath, "$1")
      ),
    },
    setupFiles: [
      expect.stringContaining(
        path.join(reactNativeMacOSPath, "jest", "setup.js")
      ),
    ],
    transform: {
      "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": expect.stringContaining(
        path.join(reactNativeMacOSPath, "jest", "assetFileTransformer.js")
      ),
      "react-native.*\\.jsx?$": [
        expect.stringContaining("babel-jest"),
        {
          presets: ["module:metro-react-native-babel-preset"],
        },
      ],
      "\\.[jt]sx?$": [
        expect.stringMatching(/@swc[/\\]jest/),
        { jsc: { target: "es2022" } },
      ],
    },
  });

  const jestMultiPlatformPreset = {
    haste: {
      defaultPlatform: "macos",
      platforms: ["macos", "native"],
    },
    moduleNameMapper: {
      "^react-native$": expect.stringContaining(reactNativeMultiPlatformPath),
      "^react-native/(.*)": expect.stringContaining(
        path.join(reactNativeMultiPlatformPath, "$1")
      ),
    },
    setupFiles: [
      expect.stringContaining(
        path.join(reactNativeMultiPlatformPath, "jest", "setup.js")
      ),
    ],
    transform: {
      "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": expect.stringContaining(
        path.join(
          reactNativeMultiPlatformPath,
          "jest",
          "assetFileTransformer.js"
        )
      ),
      "react-native.*\\.jsx?$": [
        expect.stringContaining("babel-jest"),
        {
          presets: ["module:metro-react-native-babel-preset"],
        },
      ],
      "\\.[jt]sx?$": [
        expect.stringMatching(/@swc[/\\]jest/),
        { jsc: { target: "es2022" } },
      ],
    },
  };

  const jestWindowsPreset = {
    haste: {
      defaultPlatform: "windows",
      platforms: ["windows", "win", "native"],
    },
    moduleNameMapper: {
      "^react-native$": expect.stringContaining(reactNativeWindowsPath),
      "^react-native/(.*)": expect.stringContaining(
        path.join(reactNativeWindowsPath, "$1")
      ),
    },
    setupFiles: [
      expect.stringContaining(
        path.join(reactNativeWindowsPath, "jest", "setup.js")
      ),
    ],
    transform: {
      "\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$": expect.stringContaining(
        path.join(reactNativeWindowsPath, "jest", "assetFileTransformer.js")
      ),
      "react-native.*\\.jsx?$": [
        expect.stringContaining("babel-jest"),
        {
          presets: ["module:metro-react-native-babel-preset"],
        },
      ],
      "\\.[jt]sx?$": [
        expect.stringMatching(/@swc[/\\]jest/),
        { jsc: { target: "es2022" } },
      ],
    },
  };

  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const currentDir = process.cwd();

  afterEach(() => {
    consoleWarnSpy.mockReset();
    process.chdir(currentDir);
  });

  test("throws if no package root is found", () => {
    const root =
      os.platform() === "win32"
        ? currentDir.substring(0, currentDir.indexOf(path.sep) + 1)
        : "/";
    process.chdir(root);

    expect(() => jestPreset()).toThrowError(
      "Failed to resolve current package root"
    );

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("returns default preset with support for TypeScript", () => {
    setFixture("project-with-config");

    expect(jestPreset()).toEqual(
      expect.objectContaining({
        haste: undefined,
        moduleNameMapper: {},
        setupFiles: undefined,
        transform: {
          "react-native.*\\.jsx?$": [
            expect.stringContaining("babel-jest"),
            {
              presets: [
                ["@babel/preset-env", { targets: { node: "current" } }],
                "@babel/preset-typescript",
              ],
            },
          ],
          "\\.[jt]sx?$": [
            expect.stringMatching(/@swc[/\\]jest/),
            { jsc: { target: "es2022" } },
          ],
        },
        transformIgnorePatterns: [
          "node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)",
        ],
      })
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  test("uses user-defined `reactNativePath`", () => {
    setFixture("project-with-override");

    expect(jestPreset()).toEqual(expect.objectContaining(jestWindowsPreset));
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("auto-detects the out-of-tree platform package when inside one", () => {
    setFixture("react-native-windows");

    expect(jestPreset()).toEqual(expect.objectContaining(jestWindowsPreset));
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("picks the first package with `npmPackageName` defined", () => {
    setFixture("react-native-macos");

    expect(jestPreset()).toEqual(
      expect.objectContaining(jestMacOSPreset(reactNativeMacOSPath))
    );
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  test("warns if there are several platforms with `npmPackageName` defined", () => {
    setFixture("multi-platform");

    expect(jestPreset()).toEqual(
      expect.objectContaining(jestMultiPlatformPreset)
    );
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  test("throws if an unknown platform is targeted", () => {
    const targetPlatform = "nextstep";
    expect(() => jestPreset(targetPlatform)).toThrowError(
      `'${targetPlatform}' was not found`
    );
  });

  test("returns preset for a core platform", () => {
    setFixture("multi-platform");

    expect(jestPreset("ios")).toEqual(expect.objectContaining(jestIOSPreset));
  });

  test("returns preset for an out-of-tree platform", () => {
    setFixture("multi-platform");

    expect(jestPreset("macos")).toEqual(
      expect.objectContaining(jestMacOSPreset(path.sep + "react-native-macos"))
    );
  });
});
