import { deepEqual, equal, throws } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  expandPlatformExtensions,
  getAvailablePlatformsUncached,
  parsePlatform,
  platformExtensions,
} from "../src/platform";

describe("React Native > Platform", () => {
  it("expandPlatformExtensions() expands returns all platform extensions", () => {
    deepEqual(expandPlatformExtensions("ios", [".ts", ".tsx"]), [
      ".ios.ts",
      ".ios.tsx",
      ".native.ts",
      ".native.tsx",
      ".ts",
      ".tsx",
    ]);
    deepEqual(expandPlatformExtensions("windows", [".ts", ".tsx"]), [
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

  it("getAvailablePlatformsUncached() returns available platforms", () => {
    const fixture = path.join(__dirname, "__fixtures__", "available-platforms");
    deepEqual(getAvailablePlatformsUncached(fixture), {
      android: "",
      ios: "",
      macos: "react-native-macos",
      win32: "@office-iss/react-native-win32",
      windows: "react-native-windows",
    });
  });

  it("getAvailablePlatformsUncached() finds package root", () => {
    const fixture = path.join(
      __dirname,
      "__fixtures__",
      "available-platforms",
      "node_modules"
    );
    deepEqual(getAvailablePlatformsUncached(fixture), {
      android: "",
      ios: "",
      macos: "react-native-macos",
      win32: "@office-iss/react-native-win32",
      windows: "react-native-windows",
    });
  });

  it("parsePlatform() succeeds for all known platforms", () => {
    equal(parsePlatform("ios"), "ios");
    equal(parsePlatform("android"), "android");
    equal(parsePlatform("windows"), "windows");
    equal(parsePlatform("win32"), "win32");
    equal(parsePlatform("macos"), "macos");
  });

  it("parsePlatform() throws on failure", () => {
    throws(() => parsePlatform("invalid"));
  });

  it("platformExtensions() returns extensions", () => {
    deepEqual(platformExtensions("android"), ["android", "native"]);
    deepEqual(platformExtensions("ios"), ["ios", "native"]);
    deepEqual(platformExtensions("macos"), ["macos", "native"]);
    deepEqual(platformExtensions("win32"), ["win32", "win", "native"]);
    deepEqual(platformExtensions("windows"), ["windows", "win", "native"]);
  });
});
