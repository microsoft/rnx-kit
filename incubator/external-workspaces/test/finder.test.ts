import { deepEqual, ok } from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  createFinderFromJs,
  createFinderFromJson,
  parseJsonPath,
} from "../src/finder";
import type { PackageDefinition } from "../src/types";

const fixtureContext: Record<string, PackageDefinition> = {
  package1: {
    path: "./foo/bar",
    version: "1.0.0",
  },
  package2: {
    path: "./foo/baz",
    version: "1.0.0",
  },
};

describe("createFinderFromJson", () => {
  it("should return a finder function for keys at the root", () => {
    const { jsonPath, keysPath } = parseJsonPath(
      "./test/__fixtures__/root.json"
    );
    const finder = createFinderFromJson(jsonPath!, keysPath);
    ok(finder instanceof Function);
    deepEqual(finder!("package1"), fixtureContext.package1);
    deepEqual(finder!("package2"), fixtureContext.package2);
  });

  it("should return a finder function for keys embedded in package.json", () => {
    const { jsonPath, keysPath } = parseJsonPath(
      "./test/__fixtures__/package.json/external-workspaces"
    );
    const finder = createFinderFromJson(jsonPath!, keysPath);
    ok(finder instanceof Function);
    deepEqual(finder!("package1"), fixtureContext.package1);
    deepEqual(finder!("package2"), fixtureContext.package2);
  });

  it("should return a finder function with nested keys", () => {
    const { jsonPath, keysPath } = parseJsonPath(
      "./test/__fixtures__/nested.json/key1/key2"
    );
    const finder = createFinderFromJson(jsonPath!, keysPath);
    ok(finder instanceof Function);
    deepEqual(finder!("package1"), fixtureContext.package1);
    deepEqual(finder!("package2"), fixtureContext.package2);
  });
});

describe("createFinderFromJs", () => {
  it("should return a finder function for a js file", () => {
    const jsPath = path.resolve(
      process.cwd(),
      "./test/__fixtures__/js-test.js"
    );
    ok(fs.existsSync(jsPath));
    const finder = createFinderFromJs(jsPath);
    ok(finder instanceof Function);
    deepEqual(finder!("package1"), fixtureContext.package1);
    deepEqual(finder!("package2"), fixtureContext.package2);
  });

  it("should return a finder function for a cjs file", () => {
    const jsPath = path.resolve(
      process.cwd(),
      "./test/__fixtures__/cjs-test.cjs"
    );
    ok(fs.existsSync(jsPath));
    const finder = createFinderFromJs(jsPath);
    ok(finder instanceof Function);
    deepEqual(finder!("package1"), fixtureContext.package1);
    deepEqual(finder!("package2"), fixtureContext.package2);
  });
});
