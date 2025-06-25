import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureDir, ensureDirForFile } from "../src/index";
import { mockFS } from "../src/mocks";

describe("ensureDir()", () => {
  const DIR_CONTENT = JSON.stringify({ recursive: true, mode: 0o755 });

  it("creates a directory", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    ensureDir(dir, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
    equal(vol[dir], DIR_CONTENT);
  });

  it("creates nested directories", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    ensureDir(nestedDir, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
    equal(vol[nestedDir], DIR_CONTENT);
  });
});

describe("ensureDirForFile()", () => {
  const DIR_CONTENT = JSON.stringify({ recursive: true, mode: 0o755 });

  it("creates a directory", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    ensureDirForFile(`${dir}/file`, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
    equal(vol[dir], DIR_CONTENT);
  });

  it("creates nested directories", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    ensureDirForFile(`${nestedDir}/file`, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
    equal(vol[nestedDir], DIR_CONTENT);
  });
});
