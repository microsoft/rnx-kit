import fs from "fs";
import path from "path";
import tempDir from "temp-dir";
import type { PackageManifest } from "../../src/node/package";
import {
  findPackage,
  findPackageDependencyDir,
  findPackageDir,
  getMangledPackageName,
  isPackageManifest,
  parsePackageRef,
  readPackage,
  writePackage,
} from "../../src/node/package";

describe("Node > Package", () => {
  const fixtureDir = path.resolve(__dirname, "__fixtures__");

  beforeAll(() => {
    expect(fs.existsSync(fixtureDir)).toBeTrue();
    expect(fs.existsSync(tempDir)).toBeTrue();
  });

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-tools-node-package-test-")
    );
  });

  afterEach(() => {
    fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  test("parsePackageRef(react-native) returns an unscoped reference", () => {
    expect(parsePackageRef("react-native")).toEqual({ name: "react-native" });
  });

  test("parsePackageRef(@babel/core) returns a scoped reference", () => {
    expect(parsePackageRef("@babel/core")).toEqual({
      scope: "@babel",
      name: "core",
    });
  });

  test("parsePackageRef(undefined) throws an Error", () => {
    expect(() => parsePackageRef(undefined)).toThrowError();
  });

  test("parsePackageRef(@babel) throws an Error", () => {
    expect(() => parsePackageRef("@babel")).toThrowError();
  });

  test("parsePackageRef(@/core) throws an Error", () => {
    expect(() => parsePackageRef("@/core")).toThrowError();
  });

  test("getMangledPackageName(react-native) returns react-native", () => {
    expect(getMangledPackageName({ name: "react-native" })).toEqual(
      "react-native"
    );
  });

  test("getMangledPackageName(@babel/core) returns babel__core", () => {
    expect(getMangledPackageName({ scope: "@babel", name: "core" })).toEqual(
      "babel__core"
    );
  });

  test("isPackageManifest() returns true when the object is a PackageManifest", () => {
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    expect(isPackageManifest(manifest)).toBeTrue();
  });

  test("isPackageManifest() returns false when the object is not a PackageManifest", () => {
    expect(isPackageManifest(undefined)).toBeFalse();
    expect(isPackageManifest({})).toBeFalse();
    expect(isPackageManifest("hello")).toBeFalse();
    expect(isPackageManifest({ name: "name but no version" })).toBeFalse();
    expect(isPackageManifest({ version: "version but no name" })).toBeFalse();
  });

  test("readPackage() loads package.json when given its containing directory", () => {
    const manifest = readPackage(fixtureDir);
    expect(manifest.name).toEqual("test-package");
    expect(manifest.version).toEqual("4.5.1");
  });

  test("readPackage() loads package.json when given a full path to it", () => {
    const manifest = readPackage(path.join(fixtureDir, "package.json"));
    expect(manifest.name).toEqual("test-package");
    expect(manifest.version).toEqual("4.5.1");
  });

  test("writePackage() writes package.json when given a containing directory", () => {
    const pkgPath = path.join(testTempDir, "package.json");
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    expect(fs.existsSync(pkgPath)).toBeFalse();
    writePackage(testTempDir, manifest);
    expect(fs.existsSync(pkgPath)).toBeTrue();
  });

  test("writePackage() writes package.json when given a full path to it", () => {
    const pkgPath = path.join(testTempDir, "package.json");
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    expect(fs.existsSync(pkgPath)).toBeFalse();
    writePackage(pkgPath, manifest);
    expect(fs.existsSync(pkgPath)).toBeTrue();
  });

  test("findPackage() returns the nearest package.json file", () => {
    const pkgFile = findPackage(fixtureDir);
    expect(pkgFile).toEqual(path.join(fixtureDir, "package.json"));
  });

  test("findPackage() return undefined when it does not find anything", () => {
    const pkgFile = findPackage(testTempDir);
    expect(pkgFile).toBeUndefined();
  });

  test("findPackageDir() returns the parent directory of the nearest package.json file", () => {
    const pkgDir = findPackageDir(fixtureDir);
    expect(pkgDir).toEqual(fixtureDir);
  });

  test("findPackageDir() returns undefined when it does not find anything", () => {
    const pkgDir = findPackageDir(testTempDir);
    expect(pkgDir).toBeUndefined();
  });

  test("findPackageDependencyDir() returns the package directory", () => {
    const pkgDir = findPackageDependencyDir(
      {
        scope: "@babel",
        name: "core",
      },
      {
        startDir: fixtureDir,
      }
    );
    expect(pkgDir).toEqual(
      path.join(fixtureDir, "node_modules", "@babel", "core")
    );
  });

  test("findPackageDependencyDir() does not traverse symlinks by default", () => {
    const coreLinkedPath = path.join(
      fixtureDir,
      "node_modules",
      "@babel",
      "core-linked"
    );
    expect(fs.lstatSync(coreLinkedPath).isSymbolicLink()).toBeTruthy();

    const pkgDir = findPackageDependencyDir(
      {
        scope: "@babel",
        name: "core-linked",
      },
      {
        startDir: fixtureDir,
      }
    );
    expect(pkgDir).toEqual(
      path.join(fixtureDir, "node_modules", "@babel", "core-linked")
    );
  });

  test("findPackageDependencyDir() traverses symlinks when traverseSymlinks is true", () => {
    const coreLinkedPath = path.join(
      fixtureDir,
      "node_modules",
      "@babel",
      "core-linked"
    );
    expect(fs.lstatSync(coreLinkedPath).isSymbolicLink()).toBeTruthy();

    const pkgDir = findPackageDependencyDir(
      {
        scope: "@babel",
        name: "core-linked",
      },
      {
        startDir: fixtureDir,
        traverseSymlinks: false,
      }
    );
    expect(pkgDir).toEqual(
      path.join(fixtureDir, "node_modules", "@babel", "core-linked")
    );
  });

  test("findPackageDependencyDir() returns undefined when it does not find anything", () => {
    const pkgDir = findPackageDependencyDir(
      {
        name: "does-not-exist",
      },
      {
        startDir: fixtureDir,
      }
    );
    expect(pkgDir).toBeUndefined();
  });
});
