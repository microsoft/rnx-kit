import { equal, ok, rejects, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { mockFS } from "../src/mockfs/index.ts";

describe("mockFS()", () => {
  describe("existsSync()", () => {
    it("returns true for existing files", () => {
      const fs = mockFS({ "test.txt": "content" });
      equal(fs.existsSync("test.txt"), true);
    });

    it("returns false for non-existent paths", () => {
      const fs = mockFS({});
      equal(fs.existsSync("missing.txt"), false);
    });

    it("returns true for directories", () => {
      const fs = mockFS({});
      fs.mkdirSync("mydir", { recursive: true });
      equal(fs.existsSync("mydir"), true);
    });

    it("returns true for files with empty content", () => {
      const fs = mockFS({ "empty.txt": "" });
      equal(fs.existsSync("empty.txt"), true);
    });
  });

  describe("statSync()", () => {
    it("returns BigIntStats for a file", () => {
      const fs = mockFS({ "test.txt": "hello" });
      const stats = fs.statSync("test.txt", { bigint: true });
      equal(typeof stats.ino, "bigint");
      equal(typeof stats.dev, "bigint");
      equal(stats.size, BigInt(Buffer.byteLength("hello", "utf-8")));
      equal(stats.isFile(), true);
      equal(stats.isDirectory(), false);
      equal(stats.isSymbolicLink(), false);
    });

    it("returns BigIntStats for a directory", () => {
      const fs = mockFS({});
      fs.mkdirSync("mydir", { recursive: true });
      const stats = fs.statSync("mydir", { bigint: true });
      equal(stats.isDirectory(), true);
      equal(stats.isFile(), false);
      equal(stats.size, 0n);
    });

    it("throws ENOENT for non-existent path", () => {
      const fs = mockFS({});
      throws(
        () => fs.statSync("missing.txt"),
        (err: NodeJS.ErrnoException) => {
          equal(err.code, "ENOENT");
          equal(err.errno, -2);
          equal(err.syscall, "stat");
          equal(err.path, "missing.txt");
          return true;
        }
      );
    });

    it("returns undefined with throwIfNoEntry: false for missing path", () => {
      const fs = mockFS({});
      const result = fs.statSync("missing.txt", { throwIfNoEntry: false });
      equal(result, undefined);
    });

    it("returns consistent inodes for the same path", () => {
      const fs = mockFS({ "test.txt": "content" });
      const stats1 = fs.statSync("test.txt", { bigint: true });
      const stats2 = fs.statSync("test.txt", { bigint: true });
      equal(stats1.ino, stats2.ino);
    });

    it("returns different inodes for different paths", () => {
      const fs = mockFS({ "a.txt": "a", "b.txt": "b" });
      const statsA = fs.statSync("a.txt", { bigint: true });
      const statsB = fs.statSync("b.txt", { bigint: true });
      ok(statsA.ino !== statsB.ino);
    });
  });

  describe("lstatSync()", () => {
    it("returns stats with isDirectory for directories", () => {
      const fs = mockFS({});
      fs.mkdirSync("mydir", { recursive: true });
      const stats = fs.lstatSync("mydir");
      equal(stats.isDirectory(), true);
    });
  });

  describe("readFileSync()", () => {
    it("returns file content", () => {
      const fs = mockFS({ "test.txt": "content" });
      equal(fs.readFileSync("test.txt", { encoding: "utf-8" }), "content");
    });

    it("throws ENOENT for non-existent file", () => {
      const fs = mockFS({});
      throws(
        () => fs.readFileSync("missing.txt"),
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });
  });

  describe("writeFileSync()", () => {
    it("stores content in the volume", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      fs.writeFileSync("test.txt", "content");
      equal(vol["test.txt"], "content");
    });

    it("overwrites existing content", () => {
      const vol: Record<string, string> = { "test.txt": "old" };
      const fs = mockFS(vol);
      fs.writeFileSync("test.txt", "new");
      equal(vol["test.txt"], "new");
    });
  });

  describe("mkdirSync()", () => {
    it("tracks the path as a directory", () => {
      const fs = mockFS({});
      fs.mkdirSync("mydir", { recursive: true });
      ok(fs.lstatSync("mydir").isDirectory());
    });

    it("stores options as JSON in volume for backward compat", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      const options = { recursive: true, mode: 0o755 };
      fs.mkdirSync("mydir", options);
      equal(vol["mydir"], JSON.stringify(options));
    });
  });

  describe("openSync() / readSync() / closeSync()", () => {
    it("opens a file for reading", () => {
      const fs = mockFS({ "test.txt": "hello world" });
      const fd = fs.openSync("test.txt", "r");
      ok(typeof fd === "number");
      fs.closeSync(fd);
    });

    it("throws ENOENT when opening non-existent file for reading", () => {
      const fs = mockFS({});
      throws(
        () => fs.openSync("missing.txt", "r"),
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });

    it("creates empty file when opening for writing", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      const fd = fs.openSync("new.txt", "w");
      equal(vol["new.txt"], "");
      fs.closeSync(fd);
    });

    it("reads content via readSync", () => {
      const content = "hello world";
      const fs = mockFS({ "test.txt": content });
      const fd = fs.openSync("test.txt", "r");
      const buffer = Buffer.alloc(32);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      equal(bytesRead, Buffer.byteLength(content, "utf-8"));
      equal(buffer.subarray(0, bytesRead).toString("utf-8"), content);
      fs.closeSync(fd);
    });

    it("reads content in chunks with position tracking", () => {
      const content = "abcdefghij";
      const fs = mockFS({ "test.txt": content });
      const fd = fs.openSync("test.txt", "r");

      const buf1 = Buffer.alloc(5);
      const read1 = fs.readSync(fd, buf1, 0, 5, null);
      equal(read1, 5);
      equal(buf1.toString("utf-8"), "abcde");

      const buf2 = Buffer.alloc(5);
      const read2 = fs.readSync(fd, buf2, 0, 5, null);
      equal(read2, 5);
      equal(buf2.toString("utf-8"), "fghij");

      const buf3 = Buffer.alloc(5);
      const read3 = fs.readSync(fd, buf3, 0, 5, null);
      equal(read3, 0);

      fs.closeSync(fd);
    });

    it("reads from explicit position", () => {
      const content = "abcdefghij";
      const fs = mockFS({ "test.txt": content });
      const fd = fs.openSync("test.txt", "r");

      const buffer = Buffer.alloc(3);
      const bytesRead = fs.readSync(fd, buffer, 0, 3, 5);
      equal(bytesRead, 3);
      equal(buffer.toString("utf-8"), "fgh");

      fs.closeSync(fd);
    });

    it("throws for invalid file descriptor in readSync", () => {
      const fs = mockFS({});
      throws(() => {
        const buffer = Buffer.alloc(5);
        fs.readSync(999, buffer, 0, 5, null);
      });
    });
  });

  describe("writeSync()", () => {
    it("appends data to file via descriptor", () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      const fd = fs.openSync("test.txt", "w");
      fs.writeSync(fd, "hello ");
      fs.writeSync(fd, "world");
      equal(vol["test.txt"], "hello world");
      fs.closeSync(fd);
    });

    it("throws for invalid file descriptor", () => {
      const fs = mockFS({});
      throws(() => fs.writeSync(999, "data"));
    });
  });

  describe("createReadStream()", () => {
    it("streams file content", async () => {
      const content = "hello world stream test";
      const fs = mockFS({ "test.txt": content });
      const stream = fs.createReadStream("test.txt");

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      equal(Buffer.concat(chunks).toString("utf-8"), content);
    });

    it("respects highWaterMark option", async () => {
      const content = "abcdefghij";
      const fs = mockFS({ "test.txt": content });
      const stream = fs.createReadStream("test.txt", { highWaterMark: 3 });

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      equal(Buffer.concat(chunks).toString("utf-8"), content);
      ok(chunks.length > 1);
    });

    it("emits error for non-existent file", async () => {
      const fs = mockFS({});
      const stream = fs.createReadStream("missing.txt");

      let errorCaught = false;
      try {
        for await (const _chunk of stream) {
          // should not reach here
        }
      } catch (err) {
        errorCaught = true;
        equal((err as NodeJS.ErrnoException).code, "ENOENT");
      }
      ok(errorCaught);
    });
  });

  describe("promises.stat()", () => {
    it("resolves with BigIntStats for existing file", async () => {
      const fs = mockFS({ "test.txt": "content" });
      const stats = await fs.promises.stat("test.txt", { bigint: true });
      equal(typeof stats.ino, "bigint");
      equal(stats.isFile(), true);
    });

    it("resolves with BigIntStats for directory", async () => {
      const fs = mockFS({});
      await fs.promises.mkdir("mydir", { recursive: true });
      const stats = await fs.promises.stat("mydir", { bigint: true });
      equal(stats.isDirectory(), true);
    });

    it("rejects with ENOENT for non-existent path", async () => {
      const fs = mockFS({});
      await rejects(
        fs.promises.stat("missing.txt"),
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });
  });

  describe("promises.readFile()", () => {
    it("resolves with file content", async () => {
      const fs = mockFS({ "test.txt": "async content" });
      const content = await fs.promises.readFile("test.txt", {
        encoding: "utf-8",
      });
      equal(content, "async content");
    });

    it("rejects with ENOENT for non-existent file", async () => {
      const fs = mockFS({});
      await rejects(
        fs.promises.readFile("missing.txt"),
        (err: NodeJS.ErrnoException) => err.code === "ENOENT"
      );
    });
  });

  describe("promises.writeFile()", () => {
    it("stores content asynchronously", async () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      await fs.promises.writeFile("test.txt", "async content");
      equal(vol["test.txt"], "async content");
    });
  });

  describe("promises.mkdir()", () => {
    it("creates a directory asynchronously", async () => {
      const vol: Record<string, string> = {};
      const fs = mockFS(vol);
      await fs.promises.mkdir("mydir", { recursive: true });
      ok(fs.existsSync("mydir"));
      ok(fs.lstatSync("mydir").isDirectory());
    });
  });

  describe("promises.copyFile()", () => {
    it("copies file content", async () => {
      const vol: Record<string, string> = { "src.txt": "original" };
      const fs = mockFS(vol);
      await fs.promises.copyFile("src.txt", "dst.txt");
      equal(vol["dst.txt"], "original");
    });
  });

  describe("promises.cp()", () => {
    it("copies file content", async () => {
      const vol: Record<string, string> = { "src.txt": "original" };
      const fs = mockFS(vol);
      await fs.promises.cp("src.txt", "dst.txt");
      equal(vol["dst.txt"], "original");
    });
  });
});
