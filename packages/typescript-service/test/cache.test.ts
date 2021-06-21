import "jest-extended";
const fs = require("fs");
import ts from "typescript";
import { ProjectFileCache, ExternalFileCache } from "../src/cache";

jest.mock("fs");

describe("ProjectFileCache", () => {
  const fileNames = ["index.ts", "overthruster.ts"];

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("getFileNames returns initial list of files", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(cache.getFileNames()).toBeArrayOfSize(fileNames.length);
    expect(cache.getFileNames()).toIncludeSameMembers(fileNames);
  });

  test("getFileNames includes added files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.add("foo.ts");
    expect(cache.getFileNames()).toIncludeAllMembers(["foo.ts"]);
  });

  test("getFileNames does not include removed files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.delete("overthruster.ts");
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

  test("update throws when the given file is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    expect(() => cache.update("not-in-cache")).toThrowError();
  });

  test("update increments the file version", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.update(fileNames[0]);
    expect(cache.getVersion(fileNames[0])).toEqual("2");
  });

  test("update replaces the file snapshot", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.update(
      fileNames[0],
      ts.ScriptSnapshot.fromString("updated file contents")
    );
    const s = cache.getSnapshot(fileNames[0]);
    expect(s.getText(0, s.getLength())).toEqual("updated file contents");
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
    let s = cache.getSnapshot("abc.ts");
    expect(s.getText(0, s.getLength())).toEqual("original file contents");
    s = cache.getSnapshot("abc.ts");
    expect(s.getText(0, s.getLength())).toEqual("original file contents");
  });
});
