import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { fail, pass } from "../src/assertions.ts";
import { evalsAccess, grade } from "../src/grade.ts";
import type { ToolCall, Transcript } from "../src/types.ts";

function transcript(...calls: [string, Record<string, unknown>][]): Transcript {
  return {
    agent: "test",
    entries: calls.map(
      ([name, args], i): ToolCall => ({
        type: "tool",
        id: String(i),
        name,
        arguments: args,
      })
    ),
    commands: [],
    filesRead: [],
    filesWritten: [],
  };
}

describe("evalsAccess()", () => {
  it("returns eval files and folders that were read or written", () => {
    const access = evalsAccess(
      transcript(
        ["view", { path: "/repo/incubator/agent-evals/evals/a.eval.ts" }],
        ["edit", { path: "C:\\repo\\b.eval.mts", new_str: "" }],
        [
          "apply_patch",
          {
            input:
              "*** Begin Patch\n*** Add File: evals/c.ts\n+x\n*** End Patch",
          },
        ],
        ["bash", { command: "ls evals/" }],
        ["bash", { command: "cd /repo && cat evals/* > /tmp/out" }],
        ["bash", { command: "ls -la incubator/agent-evals/evals" }],
        ["bash", { command: "echo x > evals/d.eval.ts" }]
      )
    );
    deepEqual(access, [
      "/repo/incubator/agent-evals/evals/a.eval.ts",
      "C:/repo/b.eval.mts",
      "evals/c.ts",
      "evals/",
      "evals/*",
      "incubator/agent-evals/evals",
      "evals/d.eval.ts",
    ]);
  });

  it("ignores mentions of eval files that are not paths", () => {
    const access = evalsAccess(
      transcript(
        ["bash", { command: "grep -r --include=*.eval.ts foo ." }],
        ["bash", { command: "grep -r --include '*.eval.mts' foo src" }],
        ["view", { path: "/repo/incubator/agent-evals/src/cli.ts" }],
        [
          "edit",
          {
            path: "/repo/incubator/agent-evals/src/cli.ts",
            new_str: "const EVAL_FILE = /\\.eval\\.ts$/; // evals/",
          },
        ],
        ["bash", { command: "ls incubator/agent-evals/src" }]
      )
    );
    deepEqual(access, []);
  });
});

describe("grade()", () => {
  it("skips rubrics if a script check fails", async () => {
    const result = await grade(
      {
        description: "",
        assert: [
          { type: "llm-rubric", value: "Does something" },
          { type: "javascript", value: () => pass("ok") },
          { type: "javascript", value: () => fail("not ok") },
        ],
      },
      { output: "", metadata: { transcript: transcript() } }
    );
    deepEqual(result, {
      pass: false,
      score: 0,
      reason: "Rubric skipped because a script check failed; ok; not ok",
      componentResults: [
        fail("Rubric skipped because a script check failed"),
        pass("ok"),
        fail("not ok"),
      ],
    });
  });
});
