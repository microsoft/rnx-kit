import { deepEqual, equal, ok } from "node:assert/strict";
import type * as nodefs from "node:fs";
import { describe, it } from "node:test";
import ts from "typescript";
import { ExternalFileCache, ProjectFileCache } from "../src/cache";

function mockFS(obj: unknown) {
  return obj as typeof nodefs;
}

describe("ProjectFileCache", () => {
  const fileNames = ["index.ts", "overthruster.ts"];
  const snapshot = ts.ScriptSnapshot.fromString("Test snapshot");

  it("has() returns true when a file is in the cache", () => {
    const cache = new ProjectFileCache(fileNames);

    ok(cache.has(fileNames[0]));
  });

  it("has() returns false when a file is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);

    ok(!cache.has("not a real file name"));
  });

  it("set() creates a new entry when a file is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set("new-file.ts", snapshot);

    ok(cache.has("new-file.ts"));
    equal(cache.getVersion("new-file.ts"), "1");
    equal(cache.getSnapshot("new-file.ts"), snapshot);
  });

  it("set() updates an existing entry when a file is already in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set(fileNames[0], snapshot);

    ok(cache.has(fileNames[0]));
    equal(cache.getVersion(fileNames[0]), "2");
    equal(cache.getSnapshot(fileNames[0]), snapshot);
  });

  it("remove() takes an existing entry out of the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.remove(fileNames[0]);

    ok(!cache.has(fileNames[0]));
  });

  it("removeAll() empties the cache", () => {
    const cache = new ProjectFileCache(fileNames);

    ok(Array.isArray(cache.getFileNames()));
    ok(cache.getFileNames().length > 0);

    cache.removeAll();

    equal(cache.getFileNames().length, 0);
  });

  it("getFileNames() returns initial list of files", () => {
    const cache = new ProjectFileCache(fileNames);

    ok(Array.isArray(cache.getFileNames()));
    equal(cache.getFileNames().length, fileNames.length);
    deepEqual(cache.getFileNames(), fileNames);
  });

  it("getFileNames() includes added files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.set("foo.ts");

    ok(cache.getFileNames().includes("foo.ts"));
  });

  it("getFileNames() does not include removed files", () => {
    const cache = new ProjectFileCache(fileNames);
    cache.remove("overthruster.ts");

    ok(!cache.getFileNames().includes("overthruster.ts"));
  });

  it("getVersion() returns a value for a file that is in the cache", () => {
    const cache = new ProjectFileCache(fileNames);
    const v = cache.getVersion(fileNames[0]);

    equal(typeof v, "string");
    ok(v);
  });

  it("getVersion() returns undefined for a file that is not in the cache", () => {
    const cache = new ProjectFileCache(fileNames);

    ok(!cache.getVersion("not-in-cache"));
  });

  it("getSnapshot() returns a value for a file that is in the cache", () => {
    const fs = mockFS({ readFileSync: () => "file contents" });
    const cache = new ProjectFileCache(fileNames, fs);
    const s = cache.getSnapshot(fileNames[0]);

    equal(s?.getText(0, s?.getLength()), "file contents");
  });

  it("getSnapshot() returns undefined for a file that is not in the cache", () => {
    let readFileCount = 0;
    const fs = mockFS({ readFileSync: () => ++readFileCount });

    const cache = new ProjectFileCache(fileNames, fs);

    ok(!cache.getSnapshot("not-in-cache"));
    equal(readFileCount, 0);
  });
});

describe("ExternalFileCache.getSnapShot()", () => {
  it("returns the contents of the given file", () => {
    const fs = mockFS({ readFileSync: () => "external file contents" });

    const cache = new ExternalFileCache(fs);
    const s = cache.getSnapshot("abc.ts");

    equal(s.getText(0, s.getLength()), "external file contents");
  });

  it("caches the contents of the given file, returning it on subsequent calls", () => {
    let readFileCount = 0;
    const fs = mockFS({
      readFileSync: () =>
        readFileCount++ === 0
          ? "original file contents"
          : "the external file has changed",
    });

    const cache = new ExternalFileCache(fs);
    const s = cache.getSnapshot("abc.ts");

    equal(s.getText(0, s.getLength()), "original file contents");

    const s2 = cache.getSnapshot("abc.ts");

    equal(s2, s);
  });
});
