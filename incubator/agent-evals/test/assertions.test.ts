import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseDiff,
  parsePatch,
  splitCommands,
  toolWrites,
  writesBeforeApproval,
} from "../src/assertions.ts";
import type { Message, ToolCall, Transcript } from "../src/types.ts";

function bash(command: string): ToolCall {
  return { type: "tool", id: "", name: "bash", arguments: { command } };
}

function tool(name: string, args: Record<string, unknown>): ToolCall {
  return { type: "tool", id: "", name, arguments: args };
}

function user(content: string): Message {
  return { type: "message", role: "user", content };
}

function transcript(entries: Transcript["entries"], root?: string): Transcript {
  return {
    agent: "test",
    root,
    entries,
    commands: [],
    filesRead: [],
    filesWritten: [],
  };
}

describe("splitCommands()", () => {
  it("splits on `&&`, `||`, `;` and `|`", () => {
    deepEqual(splitCommands("a && b || c; d | e"), ["a", "b", "c", "d", "e"]);
  });

  it("ignores separators inside quotes", () => {
    deepEqual(splitCommands(`grep "a|b; c" f && echo 'd && e'`), [
      `grep "a|b; c" f`,
      `echo 'd && e'`,
    ]);
  });

  it("handles escaped quotes and separators", () => {
    deepEqual(splitCommands(`echo "a \\" | b" \\; c && d`), [
      `echo "a \\" | b" \\; c`,
      "d",
    ]);
  });

  it("joins line continuations", () => {
    deepEqual(splitCommands("yarn \\\n  build && yarn test"), [
      "yarn    build",
      "yarn test",
    ]);
  });

  it("splits on newlines, except inside quotes", () => {
    deepEqual(splitCommands(`a\nb "c\nd"`), ["a", `b "c\nd"`]);
  });

  it("ignores comments", () => {
    deepEqual(splitCommands("# yarn lint\na # b; c\nd#e"), ["a", "d#e"]);
  });

  it("skips heredoc bodies", () => {
    deepEqual(
      splitCommands("python3 - <<'EOF'\nprint('a && b')\nEOF\nyarn format"),
      ["python3 -", "yarn format"]
    );
    deepEqual(splitCommands("cat <<-EOF > f\n\tyarn lint\n\tEOF"), ["cat"]);
  });

  it("removes redirections", () => {
    deepEqual(
      splitCommands(
        "yarn build >/dev/null 2>&1 && yarn lint &> log | tee -a f"
      ),
      ["yarn build", "yarn lint", "tee -a f"]
    );
  });

  it("keeps `>` inside quotes", () => {
    deepEqual(splitCommands(`node -e "a > b" > out`), [`node -e "a > b"`]);
  });
});

describe("parseDiff()", () => {
  it("returns added lines per file", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -1,2 +1,2 @@",
      " unchanged",
      "-removed",
      "+added",
      "diff --git a/b.md b/b.md",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/b.md",
      "@@ -0,0 +1 @@",
      "+# b",
    ].join("\n");
    deepEqual(parseDiff(diff), [
      { path: "src/a.ts", content: "added\n" },
      { path: "b.md", content: "# b\n" },
    ]);
  });

  it("reads added lines starting with `++ ` as content", () => {
    const diff = [
      "diff --git a/a.md b/a.md",
      "--- a/a.md",
      "+++ b/a.md",
      "@@ -1,2 +1,3 @@",
      " a",
      "--- b",
      "+++ c",
      "+d",
      "\\ No newline at end of file",
      "diff --git a/e.md b/e.md",
      "--- /dev/null",
      "+++ b/e.md",
      "@@ -0,0 +1 @@",
      "+e",
    ].join("\n");
    deepEqual(parseDiff(diff), [
      { path: "a.md", content: "++ c\nd\n" },
      { path: "e.md", content: "e\n" },
    ]);
  });

  it("skips deleted files", () => {
    const diff = [
      "diff --git a/c.ts b/c.ts",
      "deleted file mode 100644",
      "--- a/c.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-c",
    ].join("\n");
    deepEqual(parseDiff(diff), []);
  });
});

describe("parsePatch()", () => {
  it("returns added lines for added and updated files", () => {
    const patch = [
      "*** Begin Patch",
      "*** Add File: test/a.test.ts",
      "+a",
      "*** Update File: src/b.ts",
      "@@",
      "-old",
      "+new",
      "*** Delete File: c.ts",
      "*** End Patch",
    ].join("\n");
    deepEqual(parsePatch(patch), [
      { path: "test/a.test.ts", content: "a\n" },
      { path: "src/b.ts", content: "new\n" },
    ]);
  });
});

describe("toolWrites()", () => {
  it("returns paths written by editing tools", () => {
    deepEqual(toolWrites(tool("create", { path: "a.md" })), ["a.md"]);
    deepEqual(toolWrites(tool("edit", {})), ["edit"]);
    deepEqual(
      toolWrites(tool("str_replace_editor", { command: "view", path: "a" })),
      []
    );
    deepEqual(toolWrites(tool("view", { path: "a" })), []);
  });

  it("returns paths written by `apply_patch`", () => {
    const input = "*** Begin Patch\n*** Add File: a.md\n+a\n*** End Patch";
    deepEqual(toolWrites(tool("apply_patch", { input })), ["a.md"]);
    deepEqual(toolWrites(tool("apply_patch", { input: "" })), ["apply_patch"]);
  });

  it("returns paths written by shell commands", () => {
    deepEqual(toolWrites(bash("cat > a.md <<EOF\nb > c\nEOF")), ["a.md"]);
    deepEqual(toolWrites(bash(`echo a >> "b c.md" 2>&1`)), ["b c.md"]);
    deepEqual(toolWrites(bash("echo a | tee -a b.md c.md")), ["b.md", "c.md"]);
    deepEqual(toolWrites(bash(`sed -i "s/a b/c/" d.md`)), ["d.md"]);
    deepEqual(toolWrites(bash("sed -i.bak -e s/a/b/ d.md")), ["d.md"]);
    deepEqual(toolWrites(bash("cp -r a b && mv c d")), ["b", "d"]);
  });

  it("ignores files outside the repository root", () => {
    const root = "/repo";
    deepEqual(toolWrites(tool("create", { path: "/repo/a.md" }), root), [
      "a.md",
    ]);
    deepEqual(toolWrites(tool("create", { path: "/root/plan.md" }), root), []);
    deepEqual(toolWrites(tool("create", { path: "b.md" }), root), ["b.md"]);
    const input = "*** Begin Patch\n*** Add File: /repo/../c.md\n+c";
    deepEqual(toolWrites(tool("apply_patch", { input }), root), []);
    deepEqual(toolWrites(bash("echo a > /home/x.md > d.md"), root), ["d.md"]);
  });

  it("ignores shell commands that do not write", () => {
    deepEqual(toolWrites(bash(`sed "s/a/b/" c && node -e "a > b"`)), []);
    deepEqual(toolWrites(bash("yarn build >/tmp/log 2>/dev/null")), []);
  });
});

describe("writesBeforeApproval()", () => {
  it("returns files written before the second user message", () => {
    const input = "*** Begin Patch\n*** Add File: test/a.test.ts\n+a";
    const entries = [
      user("Implement it"),
      tool("view", { path: "README.md" }),
      tool("apply_patch", { input }),
      bash("echo a > docs.md && yarn lint"),
      user("Approved"),
      tool("create", { path: "b.ts" }),
    ];
    deepEqual(writesBeforeApproval(transcript(entries)), [
      "test/a.test.ts",
      "docs.md",
    ]);
  });

  it("treats an answer to `ask_user` as approval", () => {
    const answered = { ...tool("ask_user", {}), success: true };
    const entries = [
      user("Implement it"),
      tool("create", { path: "a.ts" }),
      { ...tool("ask_user", {}), success: false },
      tool("create", { path: "b.ts" }),
      answered,
      tool("create", { path: "c.ts" }),
    ];
    deepEqual(writesBeforeApproval(transcript(entries)), ["a.ts", "b.ts"]);
  });

  it("only treats `ask_user` after the first user message as approval", () => {
    const entries = [
      { ...tool("ask_user", {}), success: true },
      user("Implement it"),
      tool("create", { path: "a.ts" }),
    ];
    deepEqual(writesBeforeApproval(transcript(entries)), ["a.ts"]);
  });

  it("ignores files outside the repository root", () => {
    const entries = [
      user("Implement it"),
      tool("create", { path: "/root/.copilot/session-state/1/plan.md" }),
      tool("create", { path: "/repo/src/a.ts" }),
    ];
    deepEqual(writesBeforeApproval(transcript(entries, "/repo")), ["src/a.ts"]);
  });
});
