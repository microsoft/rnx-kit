import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { noInlineTypeSpecifiers } from "../src/lint.ts";
import type { AgentChangedFile } from "../src/types.ts";
import { added, diffAdding, makeRun } from "./helpers.ts";

describe("noInlineTypeSpecifiers()", () => {
  function check(
    files: AgentChangedFile[],
    config: Partial<
      Parameters<typeof noInlineTypeSpecifiers>[1]["config"]
    > = {},
    diff = ""
  ) {
    return noInlineTypeSpecifiers(makeRun({ files, diff }), {
      config: { files: "\\.ts$", ...config },
    });
  }

  it("passes for separate type imports and exports", () => {
    const file = added(
      "a.ts",
      [
        'import type { A } from "a";',
        'import { b } from "b";',
        'export type { C } from "c";',
        "export { b };",
      ].join("\n")
    );
    const result = check([file]);
    equal(result.pass, true);
    equal(result.reason, "Checked a.ts");
  });

  it("fails for inline type specifiers in imports and exports", () => {
    const file = added(
      "a.ts",
      [
        'import { type A, b } from "a";',
        'export { type C, d } from "c";',
        "type E = string;",
        "export { type E };",
      ].join("\n")
    );
    const result = check([file]);
    equal(result.pass, false);
    equal(
      result.reason,
      [
        "a.ts:1: Use a separate `import type` statement",
        "a.ts:2: Use a separate `export type` statement",
        "a.ts:4: Use a separate `export type` statement",
      ].join("\n")
    );
  });

  it("only checks matching, existing files", () => {
    const result = check([
      added("a.js", 'import { type A } from "a";'),
      { path: "b.ts", status: "deleted" },
    ]);
    equal(result.pass, true);
    equal(result.reason, "Checked (none)");
  });

  it("reports parse errors", () => {
    const result = check([added("a.ts", "import {")]);
    equal(result.pass, false);
    equal(result.reason.startsWith("a.ts: "), true);
  });

  it("only checks added lines with `addedLinesOnly`", () => {
    const file = added(
      "a.ts",
      'import { type A } from "a";\nimport { type B } from "b";'
    );
    const config = { addedLinesOnly: true };

    const result = check([file], config, diffAdding(file, [2]));
    equal(result.pass, false);
    equal(result.reason, "a.ts:2: Use a separate `import type` statement");

    const other = added("b.ts", "");
    const skipped = check([file, other], config, diffAdding(other));
    equal(skipped.pass, true);
    equal(skipped.reason, "Checked b.ts");
  });
});
