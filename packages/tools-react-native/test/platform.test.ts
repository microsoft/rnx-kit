import * as path from "path";
import {
  expandPlatformExtensions,
  getAvailablePlatformsUncached,
  parsePlatform,
  platformExtensions,
} from "../src/platform";

describe("React Native > Platform", () => {
  test("expandPlatformExtensions() expands returns all platform extensions", () => {
    expect(expandPlatformExtensions("ios", [".ts", ".tsx"])).toEqual([
      ".ios.ts",
      ".ios.tsx",
      ".native.ts",
      ".native.tsx",
      ".ts",
      ".tsx",
    ]);
    expect(expandPlatformExtensions("windows", [".ts", ".tsx"])).toEqual([
      ".windows.ts",
      ".windows.tsx",
      ".win.ts",
      ".win.tsx",
      ".native.ts",
      ".native.tsx",
      ".ts",
      ".tsx",
    ]);
  });

  test("getAvailablePlatformsUncached() returns available platforms", () => {
    const fixture = path.join(__dirname, "__fixtures__", "available-platforms");
    expect(getAvailablePlatformsUncached(fixture)).toMatchInlineSnapshot(`
      Object {
        "android": "",
        "ios": "",
        "macos": "react-native-macos",
        "win32": "@office-iss/react-native-win32",
        "windows": "react-native-windows",
      }
    `);
  });

  test("getAvailablePlatformsUncached() finds package root", () => {
    const fixture = path.join(
      __dirname,
      "__fixtures__",
      "available-platforms",
      "node_modules",
      "react-native"
    );
    expect(getAvailablePlatformsUncached(fixture)).toMatchInlineSnapshot(`
      Object {
        "android": "",
        "ios": "",
        "macos": "react-native-macos",
        "win32": "@office-iss/react-native-win32",
        "windows": "react-native-windows",
      }
    `);
  });

  test("getAvailablePlatformsUncached() handles 'missing' package root", () => {
    expect(getAvailablePlatformsUncached()).toMatchInlineSnapshot(`
      Object {
        "android": "",
        "ios": "",
      }
    `);
  });

  test("parsePlatform() succeeds for all known platforms", () => {
    expect(parsePlatform("ios")).toEqual("ios");
    expect(parsePlatform("android")).toEqual("android");
    expect(parsePlatform("windows")).toEqual("windows");
    expect(parsePlatform("win32")).toEqual("win32");
    expect(parsePlatform("macos")).toEqual("macos");
  });

  test("parsePlatform() throws on failure", () => {
    expect(() => parsePlatform("invalid")).toThrowError();
  });

  test("platformExtensions() returns extensions", () => {
    expect(platformExtensions("android")).toEqual(["android", "native"]);
    expect(platformExtensions("ios")).toEqual(["ios", "native"]);
    expect(platformExtensions("macos")).toEqual(["macos", "native"]);
    expect(platformExtensions("win32")).toEqual(["win32", "win", "native"]);
    expect(platformExtensions("windows")).toEqual(["windows", "win", "native"]);
  });
});
