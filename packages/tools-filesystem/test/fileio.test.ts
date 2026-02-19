import { deepEqual, equal, ok, rejects, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readJson,
  readJsonSync,
  readTextFile,
  readTextFileSync,
  writeJSONFileSync,
  writeTextFileSync,
} from "../src/index.ts";
import { mockFS } from "../src/mockfs/index.ts";

describe("readTextFileSync()", () => {
  it("reads file content as UTF-8 string", () => {
    const content = "hello world";
    const fs = mockFS({ "test.txt": content });
    equal(readTextFileSync("test.txt", fs), content);
  });

  it("throws ENOENT for non-existent file", () => {
    const fs = mockFS({});
    throws(
      () => readTextFileSync("missing.txt", fs),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT"
    );
  });
});

describe("readTextFile()", () => {
  it("reads file content asynchronously", async () => {
    const content = "hello world";
    const fs = mockFS({ "test.txt": content });
    equal(await readTextFile("test.txt", fs), content);
  });

  it("rejects with ENOENT for non-existent file", async () => {
    const fs = mockFS({});
    await rejects(
      readTextFile("missing.txt", fs),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT"
    );
  });
});

describe("readJsonSync()", () => {
  it("reads and parses JSON file", () => {
    const data = { key: "value", count: 42 };
    const fs = mockFS({ "data.json": JSON.stringify(data) });
    deepEqual(readJsonSync("data.json", fs), data);
  });

  it("handles JSON file with BOM", () => {
    const data = { key: "value" };
    const fs = mockFS({ "bom.json": "\uFEFF" + JSON.stringify(data) });
    deepEqual(readJsonSync("bom.json", fs), data);
  });

  it("throws ENOENT for non-existent file", () => {
    const fs = mockFS({});
    throws(
      () => readJsonSync("missing.json", fs),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT"
    );
  });
});

describe("readJson()", () => {
  it("reads and parses JSON file asynchronously", async () => {
    const data = { items: [1, 2, 3] };
    const fs = mockFS({ "data.json": JSON.stringify(data) });
    deepEqual(await readJson("data.json", fs), data);
  });

  it("handles JSON file with BOM asynchronously", async () => {
    const data = { key: "value" };
    const fs = mockFS({ "bom.json": "\uFEFF" + JSON.stringify(data) });
    deepEqual(await readJson("bom.json", fs), data);
  });

  it("rejects with ENOENT for non-existent file", async () => {
    const fs = mockFS({});
    await rejects(
      readJson("missing.json", fs),
      (err: NodeJS.ErrnoException) => err.code === "ENOENT"
    );
  });
});

describe("writeTextFileSync()", () => {
  const CONTENT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

  it("appends newline if missing", () => {
    const fs = mockFS();

    const filePath = "file.txt";

    writeTextFileSync(filePath, CONTENT, fs);

    ok(fs.existsSync(filePath));
    equal(readTextFileSync(filePath, fs), CONTENT + "\n");
  });

  it("does not append newline if present", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const filePath = "file.txt";
    const contentWithNewline = CONTENT + "\n";

    writeTextFileSync(filePath, contentWithNewline, fs);

    ok(fs.existsSync(filePath));
    equal(readTextFileSync(filePath, fs), contentWithNewline);
  });
});

describe("writeJSONFileSync()", () => {
  const CONTENT = { key: "value" };

  it("writes JSON with indentation", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const filePath = "file.json";

    writeJSONFileSync(filePath, CONTENT, undefined, fs);

    ok(fs.existsSync(filePath));
    equal(
      readTextFileSync(filePath, fs),
      JSON.stringify(CONTENT, undefined, 2) + "\n"
    );
  });
});
