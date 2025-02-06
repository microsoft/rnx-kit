import fs from "node:fs";
import path from "node:path";
import { createFinderFromJs, tryJsonLoad } from "../src/finder";
import { PackageDefinition } from "../src/types";

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

describe("tryJsonLoad", () => {
  it("should return a finder function for keys at the root", () => {
    const finder = tryJsonLoad("./test/__fixtures__/root.json");
    expect(finder).toBeInstanceOf(Function);
    expect(finder!("package1")).toEqual(fixtureContext.package1);
    expect(finder!("package2")).toEqual(fixtureContext.package2);
  });

  it("should return a finder function for keys embedded in package.json", () => {
    const finder = tryJsonLoad(
      "./test/__fixtures__/package.json/external-workspaces"
    );
    expect(finder).toBeInstanceOf(Function);
    expect(finder!("package1")).toEqual(fixtureContext.package1);
    expect(finder!("package2")).toEqual(fixtureContext.package2);
  });

  it("should return a finder function with nested keys", () => {
    const finder = tryJsonLoad("./test/__fixtures__/nested.json/key1/key2");
    expect(finder).toBeInstanceOf(Function);
    expect(finder!("package1")).toEqual(fixtureContext.package1);
    expect(finder!("package2")).toEqual(fixtureContext.package2);
  });
});

describe("createFinderFromJs", () => {
  it("should return a finder function for a js file", () => {
    const jsPath = path.resolve(
      process.cwd(),
      "./test/__fixtures__/js-test.js"
    );
    expect(fs.existsSync(jsPath)).toBe(true);
    const finder = createFinderFromJs(jsPath);
    expect(finder).toBeInstanceOf(Function);
    expect(finder!("package1")).toEqual(fixtureContext.package1);
    expect(finder!("package2")).toEqual(fixtureContext.package2);
  });

  it("should return a finder function for a cjs file", () => {
    const jsPath = path.resolve(
      process.cwd(),
      "./test/__fixtures__/cjs-test.cjs"
    );
    expect(fs.existsSync(jsPath)).toBe(true);
    const finder = createFinderFromJs(jsPath);
    expect(finder).toBeInstanceOf(Function);
    expect(finder!("package1")).toEqual(fixtureContext.package1);
    expect(finder!("package2")).toEqual(fixtureContext.package2);
  });
});
