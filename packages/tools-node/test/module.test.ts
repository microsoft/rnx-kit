import { deepEqual, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { before, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import {
  getPackageModuleRefFromModulePath,
  isFileModuleRef,
  isPackageModuleRef,
  parseModuleRef,
} from "../src/module";

describe("Node > Module", () => {
  const fixtureDir = fileURLToPath(new URL("__fixtures__", import.meta.url));

  before(() => {
    ok(fs.existsSync(fixtureDir));
  });

  it("parseModuleRef('react-native')", () => {
    deepEqual(parseModuleRef("react-native"), {
      name: "react-native",
    });
  });

  it("parseModuleRef('react-native/Libraries/Promise')", () => {
    deepEqual(parseModuleRef("react-native/Libraries/Promise"), {
      name: "react-native",
      path: "Libraries/Promise",
      scope: undefined,
    });
  });

  it("parseModuleRef('@babel/core')", () => {
    deepEqual(parseModuleRef("@babel/core"), {
      scope: "@babel",
      name: "core",
      path: undefined,
    });
  });

  it("parseModuleRef('@babel/core/parse')", () => {
    deepEqual(parseModuleRef("@babel/core/parse"), {
      scope: "@babel",
      name: "core",
      path: "parse",
    });
  });

  it("parseModuleRef('@types/babel__core')", () => {
    deepEqual(parseModuleRef("@types/babel__core"), {
      scope: "@types",
      name: "babel__core",
      path: undefined,
    });
  });

  it("parseModuleRef('./parser')", () => {
    deepEqual(parseModuleRef("./parser"), {
      path: "./parser",
    });
  });

  it("parseModuleRef('../../src/parser')", () => {
    deepEqual(parseModuleRef("../../src/parser"), {
      path: "../../src/parser",
    });
  });

  it("parseModuleRef('/absolute/path/src/parser')", () => {
    deepEqual(parseModuleRef("/absolute/path/src/parser"), {
      path: "/absolute/path/src/parser",
    });
    if (os.platform() === "win32") {
      deepEqual(parseModuleRef("C:/absolute/path/src/parser"), {
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

  it("isPackageModuleRef() returns true for package-based refs", () => {
    for (const r of packageModuleRefs) {
      ok(isPackageModuleRef(parseModuleRef(r)));
    }
  });

  it("isPackageModuleRef() returns false for file-based refs", () => {
    for (const r of fileModuleRefs) {
      ok(!isPackageModuleRef(parseModuleRef(r)));
    }
  });

  it("isFileModuleRef() returns true for file-based refs", () => {
    for (const r of fileModuleRefs) {
      ok(isFileModuleRef(parseModuleRef(r)));
    }
  });

  it("isFileModuleRef() returns false for package-based refs", () => {
    for (const r of packageModuleRefs) {
      ok(!isFileModuleRef(parseModuleRef(r)));
    }
  });

  it("getPackageModuleRefFromModulePath() returns a valid ref when given a path to a scoped module", () => {
    deepEqual(
      getPackageModuleRefFromModulePath(
        path.join(fixtureDir, "node_modules", "@babel", "core", "foo")
      ),
      {
        scope: "@babel",
        name: "core",
        path: "foo",
      }
    );
  });
});
