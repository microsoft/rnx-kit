import type { AgentChangedFile } from "@rnx-kit/agent-evals";
import { equal, throws } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { passesOxlint } from "../src/oxlint.ts";
import { WORKSPACE, added, makeRun } from "./helpers.ts";

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
