import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { forGrader } from "../src/transforms.ts";
import { added, diffAdding, makeRun } from "./helpers.ts";

describe("forGrader()", () => {
  it("formats an empty run", () => {
    equal(
      forGrader(makeRun({ finalMessage: "Done" })),
      [
        "## Commands",
        "(none)",
        "## Tool calls",
        "(none)",
        "## Diff",
        "(none)",
        "## Final message",
        "Done",
      ].join("\n\n")
    );
  });

  it("formats commands, tool calls and diff", () => {
    const diff = diffAdding(added("a.ts", "one"));
    const output = forGrader(
      JSON.stringify(
        makeRun({
          commands: [
            { argv: ["yarn", "test", "test/a b.test.ts"], cwd: "packages/a" },
            { argv: ["git", "status"], cwd: "." },
          ],
          toolCalls: [{ name: "view", arguments: { path: "a.ts" } }],
          diff,
          finalMessage: "Done",
        })
      )
    );
    equal(
      output,
      [
        "## Commands",
        "[packages/a] $ yarn test 'test/a b.test.ts'\n[.] $ git status",
        "## Tool calls",
        'view {"path":"a.ts"}',
        "## Diff",
        diff,
        "## Final message",
        "Done",
      ].join("\n\n")
    );
  });

  it("summarizes lockfile changes", () => {
    const source = diffAdding(added("a.ts", "one"));
    const lockfiles = [
      "yarn.lock",
      "packages/a/package-lock.json",
      "pnpm-lock.yaml",
    ]
      .map((path) => diffAdding(added(path, "one\ntwo")))
      .join("");
    const removed = [
      "diff --git a/yarn.lock b/yarn.lock",
      "deleted file mode 100644",
      "--- a/yarn.lock",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-one",
      "",
    ].join("\n");

    const output = forGrader(makeRun({ diff: source + lockfiles + removed }));
    const diffSection = output
      .split("\n\n## Diff\n\n")[1]
      .split("\n\n## Final message")[0];
    equal(
      diffSection,
      source +
        [
          "(yarn.lock: 2 lines added, 0 lines removed; omitted)",
          "(packages/a/package-lock.json: 2 lines added, 0 lines removed; omitted)",
          "(pnpm-lock.yaml: 2 lines added, 0 lines removed; omitted)",
          "(yarn.lock: 0 lines added, 1 lines removed; omitted)",
          "",
        ].join("\n")
    );
  });
});
