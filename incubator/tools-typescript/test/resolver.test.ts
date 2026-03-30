import {
  clearRootCaches,
  getFilesToSearch,
  getTsModuleCache,
  getTsTypeRefCache,
  remapModuleName,
} from "../src/resolver.ts";

const root1 = "/src/packages/my-package";
const root2 = "\\c:\\dev\\src\\packages\\my-package";

describe("get typescript caches", () => {
  beforeEach(() => {
    clearRootCaches(root1);
    clearRootCaches(root2);
  });

  it("should cache the module cache for a root", () => {
    const cache1 = getTsModuleCache(root1);
    expect(cache1).toBe(getTsModuleCache(root1));
    const typeCache = getTsTypeRefCache(root1);
    expect(typeCache).toBe(getTsTypeRefCache(root1));
  });

  it("should separate caches per root", () => {
    const cache1 = getTsModuleCache(root1);
    expect(cache1).toBe(getTsModuleCache(root1));
    const cache2 = getTsModuleCache(root2);
    expect(cache2).toBe(getTsModuleCache(root2));
    expect(cache1).not.toBe(cache2);
  });

  it("should clear caches for a root", () => {
    const cache1 = getTsModuleCache(root1);
    expect(cache1).toBe(getTsModuleCache(root1));
    clearRootCaches(root1);
    expect(cache1).not.toBe(getTsModuleCache(root1));
  });
});

describe("getFilesToSearch", () => {
  it("should return the original file ref if no suffixes are provided", () => {
    expect(getFilesToSearch("./folder/file")).toEqual(["./folder/file"]);
    expect(getFilesToSearch("./folder/file.js")).toEqual(["./folder/file.js"]);
  });

  it("should return the file ref with suffixes when no extension is present", () => {
    expect(getFilesToSearch("./folder/file", [".ios", ".native", "."])).toEqual(
      ["./folder/file.ios", "./folder/file.native", "./folder/file"]
    );
  });

  it("should return the file ref with suffixes when an extension is present", () => {
    expect(
      getFilesToSearch("./folder/file.tsx", [".ios", ".native", "."])
    ).toEqual([
      "./folder/file.ios.tsx",
      "./folder/file.native.tsx",
      "./folder/file.tsx",
    ]);
  });

  it("should handle files with an existing suffix", () => {
    expect(
      getFilesToSearch("./folder/file.types", [".ios", ".native", "."])
    ).toEqual([
      "./folder/file.types.ios",
      "./folder/file.types.native",
      "./folder/file.types",
    ]);
    expect(
      getFilesToSearch("./folder/file.types.js", [".ios", ".native", "."])
    ).toEqual([
      "./folder/file.types.ios.js",
      "./folder/file.types.native.js",
      "./folder/file.types.js",
    ]);
  });

  it("should handle d.ts files", () => {
    expect(
      getFilesToSearch("./src/file.types.d.ts", [".ios", ".native", "."])
    ).toEqual([
      "./src/file.types.ios.d.ts",
      "./src/file.types.native.d.ts",
      "./src/file.types.d.ts",
    ]);
  });
});

describe("remapModuleName", () => {
  it("should handle all permutations", () => {
    const remap = {
      "@foo/pkg-1": "@foo/pkg-baz",
      foo: "baz",
      "@dash-scope/bar": "dash-pkg",
    };
    expect(remapModuleName("foo", remap)).toBe("baz");
    expect(remapModuleName("@foo/pkg-1", remap)).toBe("@foo/pkg-baz");
    expect(remapModuleName("@dash-scope/bar", remap)).toBe("dash-pkg");
    expect(remapModuleName("foo/bar", remap)).toBe("baz/bar");
    expect(remapModuleName("@foo/pkg-1/bar", remap)).toBe("@foo/pkg-baz/bar");
    expect(remapModuleName("@dash-scope/bar/baz/extra", remap)).toBe(
      "dash-pkg/baz/extra"
    );
  });
});
