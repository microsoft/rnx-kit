import "jest-extended";
const fs = require("fs");
import ts from "typescript";
import { ProjectFileCache, ExternalFileCache } from "../src/cache";

jest.mock("fs");

describe("ProjectFileCache", () => {
  const fileNames = ["index.ts", "overthruster.ts"];
  const snapshot = ts.ScriptSnapshot.fromString("Test snapshot");

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("has returns true when file is in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.has(fileNames[0])).toBeTrue();
  });

  test("has returns false when file is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.has("not a real file name")).toBeFalse();
  });

  test("set creates a new entry when the file is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set("new-file.ts", snapshot);
    expect(cache.has("new-file.ts")).toBeTrue();
    expect(cache.getVersion("new-file.ts")).toEqual("1");
    expect(cache.getSnapshot("new-file.ts")).toBe(snapshot);
  });

  test("set updates an existing entry when the file is already in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set(fileNames[0], snapshot);
    expect(cache.has(fileNames[0])).toBeTrue();
    expect(cache.getVersion(fileNames[0])).toEqual("2");
    expect(cache.getSnapshot(fileNames[0])).toBe(snapshot);
  });

  test("remove takes an existing entry out of the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.remove(fileNames[0]);
    expect(cache.has(fileNames[0])).toBeFalse();
  });

  test("removeAll empties the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.getFileNames()).toBeArray();
    expect(cache.getFileNames().length).toBeGreaterThan(0);
    cache.removeAll();
    expect(cache.getFileNames()).toBeArrayOfSize(0);
  });

  test("getFileNames returns initial list of files", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.getFileNames()).toBeArrayOfSize(fileNames.length);
    expect(cache.getFileNames()).toIncludeSameMembers(fileNames);
  });

  test("getFileNames includes added files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set("foo.ts");
    expect(cache.getFileNames()).toIncludeAllMembers(["foo.ts"]);
  });

  test("getFileNames does not include removed files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.remove("overthruster.ts");
    expect(cache.getFileNames()).not.toIncludeAllMembers(["overthruster.ts"]);
  });

  test("getVersion returns a value for a file that is in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    const v = cache.getVersion(fileNames[0]);
    expect(v).toBeString();
    expect(v).not.toBeEmpty();
  });

  test("getVersion returns undefined for a file that is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.getVersion("not-in-cache")).toBeUndefined();
  });

  test("getSnapshot returns a value for a file that is in the cache", () => {
    fs.readFileSync.mockReturnValue("file contents");
    const cache = new ProjectFileCache(fileNames);
    const s = cache.getSnapshot(fileNames[0]);
    expect(s.getText(0, s.getLength())).toEqual("file contents");
  });

  test("getSnapshot returns undefined for a file that is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.getSnapshot("not-in-cache")).toBeUndefined();
    expect(fs.readFileSync).not.toBeCalled();
  });
});

describe("ExternalFileCache", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("getSnapshot returns the contents of the given file", () => {
    fs.readFileSync.mockReturnValue("external file contents");
    const cache = new ExternalFileCache();
    const s = cache.getSnapshot("abc.ts");
    expect(s.getText(0, s.getLength())).toEqual("external file contents");
  });

  test("getSnapshot caches the contents of the given file, returning it on subsequent calls", () => {
    fs.readFileSync.mockReturnValueOnce("original file contents");
    fs.readFileSync.mockReturnValueOnce("the external file has changed");
    const cache = new ExternalFileCache();
    const s = cache.getSnapshot("abc.ts");
    expect(s.getText(0, s.getLength())).toEqual("original file contents");
    const s2 = cache.getSnapshot("abc.ts");
    expect(s2).toBe(s);
  });
});
