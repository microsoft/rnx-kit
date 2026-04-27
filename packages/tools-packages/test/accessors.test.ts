import { deepEqual, equal } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  createObjectValueAccessors,
  createPackageValueAccessors,
  createPackageValueLoader,
} from "../src/accessors.ts";
import { getPackageInfoFromPath, getRootPackageInfo } from "../src/package.ts";
import type { PackageInfo } from "../src/types.ts";

function loadTsConfig(pkgInfo: PackageInfo) {
  const tsconfigPath = path.join(pkgInfo.root, "tsconfig.json");
  return fs.existsSync(tsconfigPath) ? tsconfigPath : undefined;
}

const getTsConfigPath = createPackageValueLoader("tsconfigPath", loadTsConfig);

describe("package value loader", () => {
  it("returns undefined when no value is found", () => {
    const rootInfo = getRootPackageInfo();
    const value = getTsConfigPath(rootInfo);
    deepEqual(value, undefined);
  });

  it("returns the value when found", () => {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkgInfo = getPackageInfoFromPath(pkgPath);
    const value = getTsConfigPath(pkgInfo);
    deepEqual(value, path.join(pkgInfo.root, "tsconfig.json"));
    deepEqual(pkgInfo.workspace, true);
  });
});

describe("createObjectValueAccessors", () => {
  type Obj = Record<string | symbol, unknown>;

  it("get returns undefined and has returns false before set", () => {
    const acc = createObjectValueAccessors<Obj, string>("test");
    const obj: Obj = {};
    equal(acc.has(obj), false);
    equal(acc.get(obj), undefined);
  });

  it("set then get returns the stored value", () => {
    const acc = createObjectValueAccessors<Obj, string>("test");
    const obj: Obj = {};
    acc.set(obj, "hello");
    equal(acc.has(obj), true);
    equal(acc.get(obj), "hello");
  });

  it("each call creates a unique symbol key", () => {
    const a = createObjectValueAccessors<Obj, string>("k");
    const b = createObjectValueAccessors<Obj, string>("k");
    const obj: Obj = {};
    a.set(obj, "from-a");
    equal(b.has(obj), false);
    equal(b.get(obj), undefined);
    equal(a.get(obj), "from-a");
  });

  it("does not collide with other string-keyed properties", () => {
    const acc = createObjectValueAccessors<Obj, number>("count");
    const obj: Obj = { count: "shadow" };
    equal(acc.has(obj), false);
    acc.set(obj, 42);
    equal(acc.get(obj), 42);
    equal(obj.count, "shadow");
  });
});

describe("createPackageValueAccessors", () => {
  it("returns accessors that read/write on a PackageInfo", () => {
    const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const pkgInfo = getPackageInfoFromPath(pkgPath);
    const acc = createPackageValueAccessors<{ flag: boolean }>("flagBag");

    equal(acc.has(pkgInfo), false);
    equal(acc.get(pkgInfo), undefined);

    acc.set(pkgInfo, { flag: true });
    equal(acc.has(pkgInfo), true);
    deepEqual(acc.get(pkgInfo), { flag: true });
  });
});
