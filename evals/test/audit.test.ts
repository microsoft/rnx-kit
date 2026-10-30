import type { AgentChangedFile } from "@rnx-kit/agent-evals";
import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { changesetsMatchChanges } from "../src/audit.ts";
import { added, makeRun } from "./helpers.ts";

function changeset(name: string, ...packages: string[]): AgentChangedFile {
  const releases = packages.map((pkg) => `"${pkg}": patch`);
  return added(
    `.changeset/${name}.md`,
    `---\n${releases.join("\n")}\n---\n\nFix\n`
  );
}

describe("changesetsMatchChanges()", () => {
  it("passes with change files for every changed published package", () => {
    const files = [
      added("packages/node-pkg/src/index.ts", ""),
      changeset("a", "node-pkg"),
      changeset("b", "node-pkg"),
    ];
    equal(changesetsMatchChanges(makeRun({ files })).pass, true);
  });

  it("fails without change files for changed published packages", () => {
    const files = [added("packages/node-pkg/src/index.ts", "")];
    const result = changesetsMatchChanges(makeRun({ files }));
    equal(result.pass, false);
    equal(
      result.reason,
      "Expected at least 1 change file(s), found 0: \nNo change file releases node-pkg"
    );
  });

  it("fails with change files if no published packages changed", () => {
    const files = [added("README.md", ""), changeset("a", "node-pkg")];
    const result = changesetsMatchChanges(makeRun({ files }));
    equal(result.pass, false);
    equal(result.reason, "Expected 0 change file(s), found 1: .changeset/a.md");
  });
});
