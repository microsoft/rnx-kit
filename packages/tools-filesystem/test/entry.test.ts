import { deepEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FSEntry,
  readTextFileSync as readText,
  toFSEntry,
} from "../src/index.ts";
import { mockFS } from "../src/mockfs/index.ts";

describe("toFSEntry()", () => {
  it("converts string path to FSEntry", () => {
    const entry = toFSEntry("test.txt");
    ok(entry instanceof FSEntry);
    equal(entry.path, "test.txt");
  });

  it("returns existing FSEntry unchanged", () => {
    const fs = mockFS({ "test.txt": "content" });
    const original = new FSEntry("test.txt", fs);
    const result = toFSEntry(original);
    equal(result, original);
  });

  it("passes fsModule to new FSEntry", () => {
    const fs = mockFS({ "test.txt": "content" });
    const entry = toFSEntry("test.txt", fs);
    equal(entry.content, "content");
  });
});

describe("FSEntry", () => {
  describe("path", () => {
    it("stores the file path", () => {
      const entry = new FSEntry("some/path.txt");
      equal(entry.path, "some/path.txt");
    });
  });

  describe("Symbol.toPrimitive", () => {
    it("returns the path as string", () => {
      const fs = mockFS({ "test.txt": "content" });
      const entry = new FSEntry("test.txt", fs);
      equal(`${entry}`, "test.txt");
    });
  });

  describe("exists", () => {
    it("returns true for an existing file", () => {
      const fs = mockFS({ "test.txt": "content" });
      const entry = new FSEntry("test.txt", fs);
      equal(entry.exists, true);
    });

    it("returns false for a non-existent file", () => {
      const fs = mockFS({});
      const entry = new FSEntry("missing.txt", fs);
      equal(entry.exists, false);
    });
  });

  describe("getExists()", () => {
    it("resolves true for an existing file", async () => {
      const fs = mockFS({ "test.txt": "content" });
      const entry = new FSEntry("test.txt", fs);
      equal(await entry.getExists(), true);
    });

    it("resolves false for a non-existent file", async () => {
      const fs = mockFS({});
      const entry = new FSEntry("missing.txt", fs);
      equal(await entry.getExists(), false);
    });
  });

  describe("stats", () => {
    it("returns BigIntStats for an existing file", () => {
      const fs = mockFS({ "test.txt": "hello" });
      const entry = new FSEntry("test.txt", fs);
      const stats = entry.stats;
      equal(typeof stats.ino, "bigint");
      equal(typeof stats.dev, "bigint");
      equal(typeof stats.size, "bigint");
      equal(stats.size, BigInt(Buffer.byteLength("hello", "utf-8")));
      equal(stats.isFile(), true);
      equal(stats.isDirectory(), false);
    });

    it("throws ENOENT for a non-existent file", () => {
      const fs = mockFS({});
      const entry = new FSEntry("missing.txt", fs);
      throws(
        () => entry.stats,
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });
  });

  describe("getStats()", () => {
    it("resolves with BigIntStats for an existing file", async () => {
      const fs = mockFS({ "test.txt": "hello" });
      const entry = new FSEntry("test.txt", fs);
      const stats = await entry.getStats();
      equal(typeof stats.ino, "bigint");
      equal(stats.isFile(), true);
    });

    it("rejects with ENOENT for a non-existent file", async () => {
      const fs = mockFS({});
      const entry = new FSEntry("missing.txt", fs);
      await rejects(
        entry.getStats(),
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });
  });

  describe("content", () => {
    it("returns file content", () => {
      const fs = mockFS({ "test.txt": "hello world" });
      const entry = new FSEntry("test.txt", fs);
      equal(entry.content, "hello world");
    });

    it("caches content after first access", () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      equal(entry.content, "original");
      vol["test.txt"] = "modified";
      equal(entry.content, "original");
    });
  });

  describe("getContent()", () => {
    it("resolves with file content asynchronously", async () => {
      const fs = mockFS({ "test.txt": "async content" });
      const entry = new FSEntry("test.txt", fs);
      equal(await entry.getContent(), "async content");
    });

    it("caches content after first async access", async () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      equal(await entry.getContent(), "original");
      vol["test.txt"] = "modified";
      equal(await entry.getContent(), "original");
    });
  });

  describe("contentLoaded", () => {
    it("is false before content access", () => {
      const fs = mockFS({ "test.txt": "content" });
      const entry = new FSEntry("test.txt", fs);
      equal(entry.contentLoaded, false);
    });

    it("is true after content access", () => {
      const fs = mockFS({ "test.txt": "content" });
      const entry = new FSEntry("test.txt", fs);
      void entry.content;
      equal(entry.contentLoaded, true);
    });
  });

  describe("isDirectory / isFile", () => {
    it("isFile is true for a file entry", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      fs.writeFileSync("test.txt", "content");
      const entry = new FSEntry("test.txt", fs);
      equal(entry.isFile, true);
      equal(entry.isDirectory, false);
    });

    it("isDirectory is true for a directory entry", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      fs.mkdirSync("mydir", { recursive: true });
      const entry = new FSEntry("mydir", fs);
      equal(entry.isDirectory, true);
      equal(entry.isFile, false);
    });
  });

  describe("size", () => {
    it("returns byte size of file content", () => {
      const content = "hello";
      const fs = mockFS({ "test.txt": content });
      const entry = new FSEntry("test.txt", fs);
      equal(entry.size, Buffer.byteLength(content, "utf-8"));
    });

    it("returns correct size for multi-byte characters", () => {
      const content = "\u00e9\u00e8\u00ea";
      const fs = mockFS({ "test.txt": content });
      const entry = new FSEntry("test.txt", fs);
      equal(entry.size, Buffer.byteLength(content, "utf-8"));
    });
  });

  describe("readJsonSync()", () => {
    it("parses JSON content from file", () => {
      const data = { key: "value", num: 42 };
      const fs = mockFS({ "data.json": JSON.stringify(data) });
      const entry = new FSEntry("data.json", fs);
      deepEqual(entry.readJSONSync(), data);
    });
  });

  describe("readJson()", () => {
    it("parses JSON content asynchronously", async () => {
      const data = { key: "value", num: 42 };
      const fs = mockFS({ "data.json": JSON.stringify(data) });
      const entry = new FSEntry("data.json", fs);
      deepEqual(await entry.readJSON(), data);
    });
  });

  describe("writeJsonSync()", () => {
    it("serializes data and writes to mock fs", () => {
      const vol: Record<string, string> = { "data.json": "{}" };
      const fs = mockFS(vol);
      const entry = new FSEntry("data.json", fs);
      const data = { key: "new value" };
      entry.writeJSONSync(data);
      equal(readText("data.json", fs), JSON.stringify(data, null, 2) + "\n");
    });
  });

  describe("writeJson()", () => {
    it("serializes data and writes asynchronously", async () => {
      const vol: Record<string, string> = { "data.json": "{}" };
      const fs = mockFS(vol);
      const entry = new FSEntry("data.json", fs);
      const data = { key: "async value" };
      await entry.writeJSON(data);
      equal(readText("data.json", fs), JSON.stringify(data, null, 2) + "\n");
    });
  });

  describe("writeContentsSync()", () => {
    it("writes modified content to mock fs", () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      entry.content = "modified";
      entry.writeContentsSync();
      equal(readText("test.txt", fs), "modified\n");
    });

    it("does not write when content is not dirty", () => {
      const vol: Record<string, string> = { "test.txt": "original\n" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      void entry.content;
      entry.writeContentsSync();
      equal(readText("test.txt", fs), "original\n");
    });

    it("writes when force option is set", () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      void entry.content;
      entry.writeContentsSync({ force: true });
      equal(readText("test.txt", fs), "original\n");
    });

    it("does not append newline with option", () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      entry.content = "no newline";
      entry.writeContentsSync({ suppressNewline: true });
      equal(readText("test.txt", fs), "no newline");
    });

    it("does not double-append newline", () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      entry.content = "has newline\n";
      entry.writeContentsSync({ suppressNewline: false });
      equal(readText("test.txt", fs), "has newline\n");
    });
  });

  describe("writeContents()", () => {
    it("writes modified content asynchronously", async () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      entry.content = "async modified";
      await entry.writeContents();
      equal(readText("test.txt", fs), "async modified\n");
    });

    it("does not write when content is not dirty", async () => {
      const vol: Record<string, string> = { "test.txt": "original" };
      const fs = mockFS(vol);
      const entry = new FSEntry("test.txt", fs);
      void entry.content;
      await entry.writeContents();
      equal(readText("test.txt", fs), "original");
    });
  });
});
