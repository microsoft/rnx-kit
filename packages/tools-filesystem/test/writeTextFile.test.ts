import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readTextFileSync,
  writeJSONFileSync,
  writeTextFileSync,
} from "../src/index.ts";
import { mockFS } from "../src/mockfs/index.ts";

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
