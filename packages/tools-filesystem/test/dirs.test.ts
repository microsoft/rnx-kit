import { ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureDir, ensureDirForFile } from "../src/index.ts";
import { mockFS } from "../src/mockfs/index.ts";

describe("ensureDir()", () => {
  it("creates a directory asynchronously", async () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    await ensureDir(dir, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
  });

  it("creates nested directories asynchronously", async () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    await ensureDir(nestedDir, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
  });
});

describe("ensureDirForFile()", () => {
  it("creates a directory for file path asynchronously", async () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    await ensureDirForFile(`${dir}/file.txt`, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
  });

  it("creates nested directories for file path asynchronously", async () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    await ensureDirForFile(`${nestedDir}/file.txt`, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
  });
});
