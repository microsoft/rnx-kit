import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureDirForFileSync, ensureDirSync } from "../src/index.ts";
import { mockFS } from "../src/mocks.ts";

describe("ensureDirSync()", () => {
  const DIR_CONTENT = JSON.stringify({ recursive: true, mode: 0o755 });

  it("creates a directory", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    ensureDirSync(dir, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
    equal(vol[dir], DIR_CONTENT);
  });

  it("creates nested directories", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    ensureDirSync(nestedDir, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
    equal(vol[nestedDir], DIR_CONTENT);
  });
});

describe("ensureDirForFileSync()", () => {
  const DIR_CONTENT = JSON.stringify({ recursive: true, mode: 0o755 });

  it("creates a directory", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const dir = "test/dir";

    ensureDirForFileSync(`${dir}/file`, fs);

    ok(fs.existsSync(dir));
    ok(fs.lstatSync(dir).isDirectory());
    equal(vol[dir], DIR_CONTENT);
  });

  it("creates nested directories", () => {
    const vol: Record<string, string> = {};
    const fs = mockFS(vol);

    const nestedDir = "test/nested/dir";

    ensureDirForFileSync(`${nestedDir}/file`, fs);

    ok(fs.existsSync(nestedDir));
    ok(fs.lstatSync(nestedDir).isDirectory());
    equal(vol[nestedDir], DIR_CONTENT);
  });
});
