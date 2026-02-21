import { equal } from "node:assert/strict";
import type fs from "node:fs";
import { describe, it } from "node:test";
import {
  filesMatch,
  filesMatchSync,
  FSEntry,
  isSameFileFromStats,
} from "../src/index.ts";
import { mockFS } from "../src/mockfs/index.ts";

function makeBigIntStats(
  overrides: Partial<{ ino: bigint; dev: bigint; size: bigint }>
): fs.BigIntStats {
  return {
    ino: 1n,
    dev: 1n,
    size: 0n,
    mode: 0o100644n,
    nlink: 1n,
    uid: 0n,
    gid: 0n,
    rdev: 0n,
    blksize: 4096n,
    blocks: 0n,
    atimeMs: 0n,
    mtimeMs: 0n,
    ctimeMs: 0n,
    birthtimeMs: 0n,
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
    atimeNs: 0n,
    mtimeNs: 0n,
    ctimeNs: 0n,
    birthtimeNs: 0n,
    isFile: () => true,
    isDirectory: () => false,
    isSymbolicLink: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    ...overrides,
  } as fs.BigIntStats;
}

// 200KB content - exceeds the 128KB CHUNK_SIZE threshold
const LARGE_CONTENT_A = "a".repeat(200 * 1024);
const LARGE_CONTENT_B = "a".repeat(200 * 1024 - 1) + "b";

describe("isSameFileFromStats()", () => {
  it("returns true when inode and device match", () => {
    const stats1 = makeBigIntStats({ ino: 100n, dev: 1n, size: 50n });
    const stats2 = makeBigIntStats({ ino: 100n, dev: 1n, size: 50n });
    equal(isSameFileFromStats(stats1, stats2), true);
  });

  it("returns false when sizes differ", () => {
    const stats1 = makeBigIntStats({ ino: 1n, dev: 1n, size: 100n });
    const stats2 = makeBigIntStats({ ino: 2n, dev: 1n, size: 200n });
    equal(isSameFileFromStats(stats1, stats2), false);
  });

  it("returns undefined when sizes match but inodes differ", () => {
    const stats1 = makeBigIntStats({ ino: 1n, dev: 1n, size: 100n });
    const stats2 = makeBigIntStats({ ino: 2n, dev: 1n, size: 100n });
    equal(isSameFileFromStats(stats1, stats2), undefined);
  });

  it("returns undefined when sizes match but devices differ", () => {
    const stats1 = makeBigIntStats({ ino: 1n, dev: 1n, size: 100n });
    const stats2 = makeBigIntStats({ ino: 1n, dev: 2n, size: 100n });
    equal(isSameFileFromStats(stats1, stats2), undefined);
  });
});

describe("filesMatchSync()", () => {
  it("returns true for files with identical content", () => {
    const content = "identical content";
    const mfs = mockFS({ "a.txt": content, "b.txt": content });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(filesMatchSync(a, b), true);
  });

  it("returns false for files with different content", () => {
    const mfs = mockFS({ "a.txt": "content A", "b.txt": "content B" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(filesMatchSync(a, b), false);
  });

  it("returns true when comparing same FSEntry (same inode)", () => {
    const mfs = mockFS({ "a.txt": "content" });
    const a = new FSEntry("a.txt", mfs);
    equal(filesMatchSync(a, a), true);
  });

  it("returns false for files with different sizes", () => {
    const mfs = mockFS({ "a.txt": "short", "b.txt": "much longer content" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(filesMatchSync(a, b), false);
  });

  it("returns true for empty files", () => {
    const mfs = mockFS({ "a.txt": "", "b.txt": "" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(filesMatchSync(a, b), true);
  });

  it("accepts string paths with fs parameter", () => {
    const content = "string path content";
    const mfs = mockFS({ "a.txt": content, "b.txt": content });
    equal(filesMatchSync("a.txt", "b.txt", mfs), true);
  });

  it("returns false for different files via string paths", () => {
    const mfs = mockFS({ "a.txt": "aaa", "b.txt": "bbb" });
    equal(filesMatchSync("a.txt", "b.txt", mfs), false);
  });

  it("returns true for identical large files via chunked comparison", () => {
    const mfs = mockFS({
      "a.txt": LARGE_CONTENT_A,
      "b.txt": LARGE_CONTENT_A,
    });
    equal(filesMatchSync("a.txt", "b.txt", mfs), true);
  });

  it("returns false for different large files via chunked comparison", () => {
    const mfs = mockFS({
      "a.txt": LARGE_CONTENT_A,
      "b.txt": LARGE_CONTENT_B,
    });
    equal(filesMatchSync("a.txt", "b.txt", mfs), false);
  });
});

describe("filesMatch()", () => {
  it("returns true for files with identical content", async () => {
    const content = "identical content";
    const mfs = mockFS({ "a.txt": content, "b.txt": content });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(await filesMatch(a, b), true);
  });

  it("returns false for files with different content", async () => {
    const mfs = mockFS({ "a.txt": "content A", "b.txt": "content B" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(await filesMatch(a, b), false);
  });

  it("returns true when comparing same FSEntry (same inode)", async () => {
    const mfs = mockFS({ "a.txt": "content" });
    const a = new FSEntry("a.txt", mfs);
    equal(await filesMatch(a, a), true);
  });

  it("returns false for files with different sizes", async () => {
    const mfs = mockFS({ "a.txt": "short", "b.txt": "much longer content" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(await filesMatch(a, b), false);
  });

  it("returns true for empty files", async () => {
    const mfs = mockFS({ "a.txt": "", "b.txt": "" });
    const a = new FSEntry("a.txt", mfs);
    const b = new FSEntry("b.txt", mfs);
    equal(await filesMatch(a, b), true);
  });

  it("accepts string paths with fs parameter", async () => {
    const content = "async string path content";
    const mfs = mockFS({ "a.txt": content, "b.txt": content });
    equal(await filesMatch("a.txt", "b.txt", mfs), true);
  });

  it("returns false for different files via string paths", async () => {
    const mfs = mockFS({ "a.txt": "aaa", "b.txt": "bbb" });
    equal(await filesMatch("a.txt", "b.txt", mfs), false);
  });

  it("returns true for identical large files via streaming comparison", async () => {
    const mfs = mockFS({
      "a.txt": LARGE_CONTENT_A,
      "b.txt": LARGE_CONTENT_A,
    });
    equal(await filesMatch("a.txt", "b.txt", mfs), true);
  });

  it("returns false for different large files via streaming comparison", async () => {
    const mfs = mockFS({
      "a.txt": LARGE_CONTENT_A,
      "b.txt": LARGE_CONTENT_B,
    });
    equal(await filesMatch("a.txt", "b.txt", mfs), false);
  });
});
