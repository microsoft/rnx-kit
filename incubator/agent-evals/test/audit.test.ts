import { equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { ranChecksForChanges } from "../src/audit.ts";
import type { AgentChangedFile, AgentCommand } from "../src/types.ts";
import { added, makeRun } from "./helpers.ts";

const SOURCE = added("packages/node-pkg/src/index.ts", "export {};\n");

function yarn(script: string, cwd = "packages/node-pkg"): AgentCommand {
  return { argv: ["yarn", script], cwd };
}

function check(
  files: AgentChangedFile[],
  commands: AgentCommand[],
  scripts?: string[]
): ReturnType<typeof ranChecksForChanges> {
  return ranChecksForChanges(
    makeRun({ files, commands }),
    scripts ? { config: { scripts } } : undefined
  );
}

describe("ranChecksForChanges()", () => {
  it("passes if format, lint and test ran in the changed package", () => {
    const result = check(
      [SOURCE],
      [yarn("format"), yarn("lint"), yarn("test")]
    );
    equal(result.pass, true);
    equal(result.reason, "Ran: yarn format\nRan: yarn lint\nRan: yarn test");
  });

  it("passes if the checks ran at the repository root", () => {
    const result = check(
      [SOURCE],
      [yarn("format", "."), yarn("lint", "."), yarn("test", ".")]
    );
    equal(result.pass, true);
  });

  it("fails if a check did not run or ran in another package", () => {
    const result = check(
      [SOURCE],
      [yarn("format"), yarn("lint", "packages/jest-config")]
    );
    equal(result.pass, false);
    equal(
      result.reason,
      "Did not run 'yarn lint' in packages/node-pkg\nDid not run 'yarn test' in packages/node-pkg"
    );
  });

  it("only requires the configured scripts", () => {
    equal(check([SOURCE], [yarn("test")], ["test"]).pass, true);
    equal(check([SOURCE], [yarn("format")], ["test"]).pass, false);
  });

  it("skips scripts the package does not define", () => {
    const result = check([added("packages/jest-config/index.js", "")], []);
    equal(result.pass, true);
    equal(
      result.reason,
      "packages/jest-config defines none of: format, lint, test"
    );
  });

  it("is not applicable if no source files changed", () => {
    const result = check(
      [
        added("packages/node-pkg/README.md", ""),
        { path: "packages/node-pkg/src/old.ts", status: "deleted" },
        added("index.ts", ""),
      ],
      []
    );
    equal(result.pass, true);
    equal(
      result.reason,
      "Not applicable: no source files changed in workspace packages"
    );
  });
});
