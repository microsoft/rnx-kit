import * as fs from "node:fs";
import * as path from "node:path";
import { setCCacheDir, setCCacheHome } from "../../src/build/ccache.ts";

describe("build/ccache", () => {
  const environment: Record<string, string | undefined> = {
    CCACHE_DIR: undefined,
    CC: undefined,
    CXX: undefined,
    CMAKE_C_COMPILER_LAUNCHER: undefined,
    CMAKE_CXX_COMPILER_LAUNCHER: undefined,
  };

  function restoreEnvironment() {
    for (const [key, value] of Object.entries(environment)) {
      if (value) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  }

  function saveEnvironment() {
    for (const key of Object.keys(environment)) {
      environment[key] = process.env[key];
    }
  }

  beforeAll(() => {
    saveEnvironment();
  });

  afterEach(() => {
    restoreEnvironment();
  });

  describe("setCCacheDir", () => {
    it("returns `undefined` and leaves the environment untouched when the directory does not exist", () => {
      expect(setCCacheDir("does-not-exist")).toBeUndefined();
      expect(process.env["CCACHE_DIR"]).toBeUndefined();
    });

    it("sets `CCACHE_DIR` when the directory exists", () => {
      const mockfs = { ...fs, existsSync: () => true };
      const cacheDir = "<ccache-dir>";

      expect(setCCacheDir(cacheDir, mockfs)).toBe(cacheDir);
      expect(process.env["CCACHE_DIR"]).toBe(cacheDir);
    });
  });

  describe("setCCacheHome", () => {
    it("returns `undefined` and leaves the environment untouched when the directory does not exist", () => {
      expect(setCCacheHome("does-not-exist")).toBeUndefined();
      expect(process.env["CC"]).toBeUndefined();
      expect(process.env["CXX"]).toBeUndefined();
      expect(process.env["CMAKE_C_COMPILER_LAUNCHER"]).toBeUndefined();
      expect(process.env["CMAKE_CXX_COMPILER_LAUNCHER"]).toBeUndefined();
    });

    it("sets compiler and CMake launcher variables when the directory exists", () => {
      const mockfs = { ...fs, existsSync: () => true };
      const cacheDir = "<ccache-dir>";

      expect(setCCacheHome(cacheDir, mockfs)).toBe(cacheDir);
      expect(process.env["CC"]).toBe(path.join(cacheDir, "libexec", "clang"));
      expect(process.env["CXX"]).toBe(
        path.join(cacheDir, "libexec", "clang++")
      );
      expect(process.env["CMAKE_C_COMPILER_LAUNCHER"]).toBe(
        path.join(cacheDir, "bin", "ccache")
      );
      expect(process.env["CMAKE_CXX_COMPILER_LAUNCHER"]).toBe(
        path.join(cacheDir, "bin", "ccache")
      );
    });
  });
});
