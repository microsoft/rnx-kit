import { deepEqual } from "node:assert/strict";
import * as fs from "node:fs";
import { describe, it } from "node:test";
import { copilot } from "../src/adapters/copilot.ts";

describe("copilot()", () => {
  const log = fs.readFileSync(
    new URL("__fixtures__/events.jsonl", import.meta.url),
    "utf-8"
  );

  it("converts a session log into a transcript", () => {
    deepEqual(copilot(log), {
      agent: "copilot",
      entries: [
        { type: "message", role: "user", content: "Fix the bug" },
        { type: "message", role: "assistant", content: "Looking into it" },
        {
          type: "tool",
          id: "1",
          name: "bash",
          arguments: { command: "yarn test" },
          success: true,
          result: "ok",
        },
        {
          type: "tool",
          id: "2",
          name: "view",
          arguments: { path: "/repo/src/a.ts" },
          success: false,
          result: "not found",
        },
        {
          type: "tool",
          id: "3",
          name: "view",
          arguments: { path: "/elsewhere/b.ts" },
        },
        {
          type: "tool",
          id: "4",
          name: "create",
          arguments: { path: "/repo/src/c.ts", file_text: "c" },
        },
        {
          type: "tool",
          id: "5",
          name: "edit",
          arguments: { path: "/repo/src/a.ts", old_str: "a", new_str: "b" },
        },
        {
          type: "tool",
          id: "6",
          name: "apply_patch",
          arguments: {
            input:
              "*** Begin Patch\n*** Add File: /repo/test/d.test.ts\n+d\n*** End Patch",
          },
        },
        { type: "message", role: "assistant", content: "Done" },
      ],
      commands: ["yarn test"],
      filesRead: ["src/a.ts", "/elsewhere/b.ts"],
      filesWritten: [
        { path: "src/c.ts", content: "c" },
        { path: "src/a.ts", content: "b" },
        { path: "test/d.test.ts", content: "d\n" },
      ],
    });
  });
});
