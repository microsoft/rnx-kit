import { deepEqual, equal, throws } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  addedLines,
  existingFiles,
  requireConfig,
  result,
  selectLines,
  toAgentRun,
  toRelativePath,
  tryReadJSON,
} from "../src/common.ts";
import { WORKSPACE, added, diffAdding, makeRun } from "./helpers.ts";

describe("result()", () => {
  it("passes when there are no failures", () => {
    deepEqual(result([], "ok"), { pass: true, score: 1, reason: "ok" });
  });

  it("fails with all failures as reason", () => {
    deepEqual(result(["a", "b"], "ok"), {
      pass: false,
      score: 0,
      reason: "a\nb",
    });
  });
});

describe("toAgentRun()", () => {
  it("returns objects as is", () => {
    const run = makeRun();
    equal(toAgentRun(run), run);
  });

  it("parses JSON", () => {
    deepEqual(toAgentRun(JSON.stringify(makeRun())), makeRun());
  });

  it("throws if the output is not an object", () => {
    throws(() => toAgentRun("null"), /Expected agent run to be an object/);
    throws(() => toAgentRun("1"), /Expected agent run to be an object/);
  });

  it("throws listing all invalid fields", () => {
    throws(() => toAgentRun(JSON.stringify({ commands: {}, diff: 0 })), {
      message:
        "Invalid agent run; check: commands, toolCalls, files, diff, finalMessage, workdir",
    });
  });
});

describe("addedLines()", () => {
  it("returns added line numbers per file", () => {
    const file = added("a.ts", "one\ntwo\nthree");
    deepEqual(
      addedLines(diffAdding(file, [2])),
      new Map([["a.ts", new Set([2])]])
    );
  });

  it("ignores deleted files", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "deleted file mode 100644",
      "--- a/a.ts",
      "+++ /dev/null",
      "@@ -1 +0,0 @@",
      "-one",
      "",
    ].join("\n");
    deepEqual(addedLines(diff), new Map());
  });

  it("returns an empty map for an empty diff", () => {
    deepEqual(addedLines(""), new Map());
  });
});

describe("requireConfig()", () => {
  it("returns the config", () => {
    deepEqual(requireConfig({ config: { a: 1 } }), { a: 1 });
  });

  it("throws if config is missing", () => {
    throws(() => requireConfig({}), /Missing assertion config/);
  });
});

describe("existingFiles()", () => {
  it("excludes deleted files", () => {
    const files = [
      added("a.ts", ""),
      { path: "b.ts", status: "deleted" as const },
      { path: "c.ts", status: "modified" as const, content: "" },
      { path: "d.ts", status: "renamed" as const, content: "" },
    ];
    deepEqual(
      existingFiles(makeRun({ files })).map((file) => file.path),
      ["a.ts", "c.ts", "d.ts"]
    );
  });
});

describe("selectLines()", () => {
  const file = added("a.ts", "one\ntwo\nthree");

  it("returns the whole content without added lines", () => {
    equal(selectLines(file), "one\ntwo\nthree");
  });

  it("returns only added lines", () => {
    equal(
      selectLines(file, new Map([["a.ts", new Set([1, 3])]])),
      "one\nthree"
    );
  });

  it("returns nothing if the file has no added lines", () => {
    equal(selectLines(file, new Map()), "");
  });

  it("treats missing content as empty", () => {
    equal(selectLines({ path: "a.ts", status: "deleted" }), "");
  });
});

describe("tryReadJSON()", () => {
  it("returns the parsed file", () => {
    equal(tryReadJSON(path.join(WORKSPACE, "package.json")).name, "fixture");
  });

  it("returns undefined if the file cannot be read", () => {
    equal(tryReadJSON(path.join(WORKSPACE, "missing.json")), undefined);
  });
});

describe("toRelativePath()", () => {
  it("returns paths relative to the workdir with forward slashes", () => {
    equal(
      toRelativePath(WORKSPACE, path.join(WORKSPACE, "packages", "node-pkg")),
      "packages/node-pkg"
    );
  });

  it("returns `.` for the workdir itself", () => {
    equal(toRelativePath(WORKSPACE, WORKSPACE), ".");
  });
});
