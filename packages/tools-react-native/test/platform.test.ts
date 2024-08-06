import { deepEqual, equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  expandPlatformExtensions,
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
