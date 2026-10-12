import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { changesets } from "../src/changesets.ts";
import type { AgentChangedFile } from "../src/types.ts";
import { added, makeRun } from "./helpers.ts";

function changeset(name: string, ...packages: string[]): AgentChangedFile {
  const releases = packages.map((pkg) => `"${pkg}": patch`);
  return added(
    `.changeset/${name}.md`,
    `---\n${releases.join("\n")}\n---\n\nFix\n`
  );
}

function check(
  files: AgentChangedFile[],
  config: Parameters<typeof changesets>[1]["config"]
) {
  return changesets(makeRun({ files }), { config });
}

describe("changesets()", () => {
  it("passes if the expected number of change files was added", () => {
    const result = check([changeset("a", "node-pkg")], {
      count: 1,
      packages: ["node-pkg"],
    });
    equal(result.pass, true);
    equal(result.reason, "Found 1 change file(s)");
  });

  it("passes if no change files were expected", () => {
    equal(check([], { count: 0 }).pass, true);
  });

  it("fails if the number of change files differs", () => {
    const result = check([changeset("a", "x"), changeset("b", "y")], {
      count: 1,
    });
    equal(result.pass, false);
    equal(
      result.reason,
      "Expected 1 change file(s), found 2: .changeset/a.md, .changeset/b.md"
    );
  });

  it("only counts added change files", () => {
    const files: AgentChangedFile[] = [
      { ...changeset("a", "x"), status: "modified" },
      { path: ".changeset/b.md", status: "deleted" },
      added(".changeset/README.md", ""),
      added(".changeset/config.json", "{}"),
      added(".changeset/sub/c.md", ""),
      added("docs/d.md", ""),
    ];
    equal(check(files, { count: 0 }).pass, true);
  });

  it("fails for packages without a change file", () => {
    const result = check([changeset("a", "x", "y")], {
      count: 1,
      packages: ["x", "y", "z"],
    });
    equal(result.pass, false);
    equal(result.reason, "No change file releases z");
  });

  it("fails for invalid change files", () => {
    const result = check([added(".changeset/a.md", "Fix")], {
      count: 1,
      packages: ["x"],
    });
    equal(result.pass, false);
    const [error, missing] = result.reason.split(/\n(?=No change file)/);
    equal(
      error.startsWith(
        ".changeset/a.md: could not parse changeset - missing or invalid frontmatter."
      ),
      true
    );
    equal(missing, "No change file releases x");
  });
});
