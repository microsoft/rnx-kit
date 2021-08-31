import fs from "fs";
import os from "os";
import path from "path";
import {
  parseModuleRef,
  isPackageModuleRef,
  isFileModuleRef,
  getPackageModuleRefFromModulePath,
} from "../src/module";

describe("Node > Module", () => {
  const fixtureDir = path.resolve(__dirname, "__fixtures__");

  beforeAll(() => {
    expect(fs.existsSync(fixtureDir)).toBe(true);
  });

  test("parseModuleRef('react-native')", () => {
    expect(parseModuleRef("react-native")).toEqual({
      name: "react-native",
    });
  });

  test("parseModuleRef('react-native/Libraries/Promise')", () => {
    expect(parseModuleRef("react-native/Libraries/Promise")).toEqual({
      name: "react-native",
      path: "Libraries/Promise",
    });
  });

  test("parseModuleRef('@babel/core')", () => {
    expect(parseModuleRef("@babel/core")).toEqual({
      scope: "@babel",
      name: "core",
    });
  });

  test("parseModuleRef('@babel/core/parse')", () => {
    expect(parseModuleRef("@babel/core/parse")).toEqual({
      scope: "@babel",
      name: "core",
      path: "parse",
    });
  });

  test("parseModuleRef('@types/babel__core')", () => {
    expect(parseModuleRef("@types/babel__core")).toEqual({
      scope: "@types",
      name: "babel__core",
    });
  });

  test("parseModuleRef('./parser')", () => {
    expect(parseModuleRef("./parser")).toEqual({
      path: "./parser",
    });
  });

  test("parseModuleRef('../../src/parser')", () => {
    expect(parseModuleRef("../../src/parser")).toEqual({
      path: "../../src/parser",
    });
  });

  test("parseModuleRef('/absolute/path/src/parser')", () => {
    expect(parseModuleRef("/absolute/path/src/parser")).toEqual({
      path: "/absolute/path/src/parser",
    });
    if (os.platform() === "win32") {
      expect(parseModuleRef("C:/absolute/path/src/parser")).toEqual({
        path: "C:/absolute/path/src/parser",
      });
    }
  });

  const packageModuleRefs: string[] = [
    "react-native",
    "react-native/Libraries/Promise",
    "@babel/core",
    "@types/babel__core",
    "@types/babel__core/parse",
  ];

  const fileModuleRefs: string[] = [
    "./parser",
    "/repos/rnx-kit/package/tools/parser",
  ];

  test("isPackageModuleRef() returns true for package-based refs", () => {
    for (const r of packageModuleRefs) {
      expect(isPackageModuleRef(parseModuleRef(r))).toBe(true);
    }
  });

  test("isPackageModuleRef() returns false for file-based refs", () => {
    for (const r of fileModuleRefs) {
      expect(isPackageModuleRef(parseModuleRef(r))).toBe(false);
    }
  });

  test("isFileModuleRef() returns true for file-based refs", () => {
    for (const r of fileModuleRefs) {
      expect(isFileModuleRef(parseModuleRef(r))).toBe(true);
    }
  });

  test("isFileModuleRef() returns false for package-based refs", () => {
    for (const r of packageModuleRefs) {
      expect(isFileModuleRef(parseModuleRef(r))).toBe(false);
    }
  });

  test("getPackageModuleRefFromModulePath() returns a valid ref when given a path to a scoped module", () => {
    expect(
      getPackageModuleRefFromModulePath(
        path.join(fixtureDir, "node_modules", "@babel", "core", "foo")
      )
    ).toEqual({
      scope: "@babel",
      name: "core",
      path: "foo",
    });
  });
});
