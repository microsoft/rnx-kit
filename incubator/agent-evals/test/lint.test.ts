import { equal, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { noInlineTypeSpecifiers, passesOxlint } from "../src/lint.ts";
import type { AgentChangedFile } from "../src/types.ts";
import { WORKSPACE, added, diffAdding, makeRun } from "./helpers.ts";

function fixture(file: string): AgentChangedFile {
  const content = fs.readFileSync(path.join(WORKSPACE, file), "utf-8");
  return added(file, content);
}

describe("passesOxlint()", () => {
  const index = fixture("packages/node-pkg/src/index.ts");
  const types = fixture("packages/node-pkg/src/types.ts");

  it("passes if no files match", () => {
    const result = passesOxlint(makeRun({ files: [index] }), {
      config: { files: "\\.md$", config: "oxlint/types-only.json" },
    });
    equal(result.pass, true);
    equal(result.reason, "No matching files changed");
  });

  it("passes if matching files pass", () => {
    const result = passesOxlint(makeRun({ files: [types] }), {
      config: { files: "/types\\.ts$", config: "oxlint/types-only.json" },
    });
    equal(result.pass, true);
    equal(result.reason, "packages/node-pkg/src/types.ts passed oxlint");
  });

  it("fails for each diagnostic", () => {
    const result = passesOxlint(makeRun({ files: [index, types] }), {
      config: {
        files: "\\.ts$",
        config: "../../test/__fixtures__/oxlint-no-plusplus.json",
      },
    });
    equal(result.pass, false);
    equal(
      result.reason,
      "packages/node-pkg/src/index.ts:3: eslint(no-plusplus): Unary operator '++' used."
    );
  });

  it("throws if oxlint cannot lint the files", () => {
    const missing = added("packages/node-pkg/src/missing.ts", "");
    throws(() =>
      passesOxlint(makeRun({ files: [missing] }), {
        config: { files: "\\.ts$", config: "oxlint/types-only.json" },
      })
    );
  });

  it("throws if the config is invalid", () => {
    throws(() =>
      passesOxlint(makeRun({ files: [types] }), {
        config: { files: "\\.ts$", config: "oxlint/missing.json" },
      })
    );
  });
});

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
