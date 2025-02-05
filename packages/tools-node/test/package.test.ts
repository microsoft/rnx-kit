import { deepEqual, equal, ok, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { PackageManifest } from "../src/package";
import {
  findPackage,
  findPackageDependencyDir,
  findPackageDir,
  parsePackageRef,
  readPackage,
  writePackage,
} from "../src/package";

describe("Node > Package", () => {
  const fixtureDir = fileURLToPath(new URL("__fixtures__", import.meta.url));
  const tempDir = fs.realpathSync(os.tmpdir());

  before(() => {
    ok(fs.existsSync(fixtureDir));
    ok(fs.existsSync(tempDir));
  });

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-tools-node-package-test-")
    );
  });

  afterEach(() => {
    fs.rmSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  it("parsePackageRef(react-native) returns an unscoped reference", () => {
    deepEqual(parsePackageRef("react-native"), {
      name: "react-native",
      scope: undefined,
    });
  });

  it("parsePackageRef(@babel/core) returns a scoped reference", () => {
    deepEqual(parsePackageRef("@babel/core"), {
      scope: "@babel",
      name: "core",
    });
  });

  it("parsePackageRef(@alias) is allowed", () => {
    deepEqual(parsePackageRef("@alias"), { name: "@alias", scope: undefined });
  });

  it("parsePackageRef(@/core) is allowed", () => {
    deepEqual(parsePackageRef("@/core"), { scope: "@", name: "core" });
  });

  it("parsePackageRef(undefined) throws an Error", () => {
    // @ts-expect-error Argument of type 'undefined' is not assignable to parameter of type 'string'
    throws(() => parsePackageRef(undefined));
  });

  it("parsePackageRef(@babel/) throws an Error", () => {
    throws(() => parsePackageRef("@babel/"));
  });

  it("readPackage() loads package.json when given its containing directory", () => {
    const manifest = readPackage(fixtureDir);
    equal(manifest.name, "test-package");
    equal(manifest.version, "4.5.1");
  });

  it("readPackage() loads package.json when given a full path to it", () => {
    const manifest = readPackage(path.join(fixtureDir, "package.json"));
    equal(manifest.name, "test-package");
    equal(manifest.version, "4.5.1");
  });

  it("writePackage() writes package.json when given a containing directory", () => {
    const pkgPath = path.join(testTempDir, "package.json");
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    ok(!fs.existsSync(pkgPath));
    writePackage(testTempDir, manifest);
    ok(fs.existsSync(pkgPath));
  });

  it("writePackage() writes package.json when given a full path to it", () => {
    const pkgPath = path.join(testTempDir, "package.json");
    const manifest: PackageManifest = {
      name: "package name",
      version: "1.0.0",
    };
    ok(!fs.existsSync(pkgPath));
    writePackage(pkgPath, manifest);
    ok(fs.existsSync(pkgPath));
  });

  it("findPackage() returns the nearest package.json file", () => {
    const pkgFile = findPackage(fixtureDir);
    equal(pkgFile, path.join(fixtureDir, "package.json"));
  });

  it("findPackage() return undefined when it does not find anything", () => {
    const pkgFile = findPackage(testTempDir);
    equal(pkgFile, undefined);
  });

  it("findPackageDir() returns the parent directory of the nearest package.json file", () => {
    const pkgDir = findPackageDir(fixtureDir);
    equal(pkgDir, fixtureDir);
  });

  it("findPackageDir() returns undefined when it does not find anything", () => {
    const pkgDir = findPackageDir(testTempDir);
    equal(pkgDir, undefined);
  });

  it("findPackageDependencyDir() returns the package directory", () => {
    const pkgDir = findPackageDependencyDir(
      {
        scope: "@babel",
        name: "core",
      },
      {
        startDir: fixtureDir,
      }
    );
    equal(pkgDir, path.join(fixtureDir, "node_modules", "@babel", "core"));
  });

  it("findPackageDependencyDir() accepts strings", () => {
    const pkgDir = findPackageDependencyDir("@babel/core", {
      startDir: fixtureDir,
    });
    equal(pkgDir, path.join(fixtureDir, "node_modules", "@babel/core"));
  });

  it(
    "findPackageDependencyDir() finds a symlink package dir by default",
    { skip: process.platform === "win32" },
    () => {
      const coreLinkedPath = path.join(
        fixtureDir,
        "node_modules",
        "@babel",
        "core-linked"
      );
      ok(fs.lstatSync(coreLinkedPath).isSymbolicLink());

      const pkgDir = findPackageDependencyDir(
        {
          scope: "@babel",
          name: "core-linked",
        },
        {
          startDir: fixtureDir,
        }
      );
      equal(
        pkgDir,
        path.join(fixtureDir, "node_modules", "@babel", "core-linked")
      );
    }
  );

  it(
    "findPackageDependencyDir() finds nothing when a symlink is the only valid result but allowSymlinks is false",
    { skip: process.platform === "win32" },
    () => {
      const coreLinkedPath = path.join(
        fixtureDir,
        "node_modules",
        "@babel",
        "core-linked"
      );
      ok(fs.lstatSync(coreLinkedPath).isSymbolicLink());

      const pkgDir = findPackageDependencyDir(
        {
          scope: "@babel",
          name: "core-linked",
        },
        {
          startDir: fixtureDir,
          allowSymlinks: false,
        }
      );
      equal(pkgDir, undefined);
    }
  );

  it("findPackageDependencyDir() returns undefined when it does not find anything", () => {
    const pkgDir = findPackageDependencyDir(
      {
        name: "does-not-exist",
      },
      {
        startDir: fixtureDir,
      }
    );
    equal(pkgDir, undefined);
  });
});
