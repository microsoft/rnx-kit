import { deepEqual, equal, match } from "node:assert/strict";
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
      root: "/repo",
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

describe("copilot() paths", () => {
  it("only makes paths inside the repository root relative", () => {
    const log = [
      { type: "session.start", data: { context: { gitRoot: "/repo" } } },
      ...["/repo/..foo/a.ts", "/repo/src/b.ts", "/c.ts"].map((p, i) => ({
        type: "tool.execution_start",
        data: {
          toolCallId: String(i),
          toolName: "view",
          arguments: { path: p },
        },
      })),
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");
    deepEqual(copilot(log).filesRead, ["..foo/a.ts", "src/b.ts", "/c.ts"]);
  });

  it("ignores writes outside the repository root", () => {
    const log = [
      { type: "session.start", data: { context: { gitRoot: "/repo" } } },
      ...["/root/.copilot/session-state/1/plan.md", "/repo/a.ts"].map(
        (p, i) => ({
          type: "tool.execution_start",
          data: {
            toolCallId: String(i),
            toolName: "create",
            arguments: { path: p, file_text: "x" },
          },
        })
      ),
    ]
      .map((event) => JSON.stringify(event))
      .join("\n");
    deepEqual(copilot(log).filesWritten, [{ path: "a.ts", content: "x" }]);
  });
});

describe("copilot() malformed logs", () => {
  it("skips malformed lines with a warning", (t) => {
    const warn = t.mock.method(console, "warn", () => undefined);
    const log = [
      '{"type": "user.message", "data": {"content": "Hi"}}',
      "null",
      '{"type": "assistant.message", "data": {"content": "Hel',
    ].join("\n");
    deepEqual(copilot(log).entries, [
      { type: "message", role: "user", content: "Hi" },
    ]);
    equal(warn.mock.callCount(), 2);
    match(String(warn.mock.calls[1].arguments[0]), /malformed line 3/);
  });
});
