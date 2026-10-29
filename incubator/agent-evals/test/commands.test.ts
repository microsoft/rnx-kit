import { equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  didNotRunCommand,
  notModifiedOnGitHub,
  ranCommand,
} from "../src/commands.ts";
import type { AgentCommand, CommandMatcher } from "../src/types.ts";
import { makeRun } from "./helpers.ts";

function ran(commands: AgentCommand[], config: CommandMatcher) {
  return ranCommand(makeRun({ commands }), { config });
}

describe("ranCommand()", () => {
  it("passes if a command matches", () => {
    const result = ran(
      [
        { argv: ["git", "status"], cwd: "." },
        { argv: ["yarn", "build"], cwd: "." },
      ],
      { pattern: "^yarn build$" }
    );
    equal(result.pass, true);
    equal(result.reason, "Ran: yarn build");
  });

  it("fails if no command matches", () => {
    const result = ran([{ argv: ["yarn", "lint"], cwd: "." }], {
      pattern: "^yarn build$",
    });
    equal(result.pass, false);
    equal(result.reason, "No command matched /^yarn build$/");
  });

  it("accepts JSON output", () => {
    const output = JSON.stringify(
      makeRun({ commands: [{ argv: ["yarn", "build"], cwd: "." }] })
    );
    equal(ranCommand(output, { config: { pattern: "^yarn" } }).pass, true);
  });

  it("throws without config", () => {
    throws(() => ranCommand(makeRun(), {}), /Missing assertion config/);
  });

  it("matches on the basename of the executable", () => {
    for (const executable of [
      "/usr/bin/git",
      "C:\\Program Files\\Git\\git.EXE",
    ]) {
      const result = ran([{ argv: [executable, "push"], cwd: "." }], {
        pattern: "^git push$",
      });
      equal(result.pass, true, executable);
    }
  });

  it("strips Windows script extensions", () => {
    for (const ext of ["bat", "cmd", "ps1"]) {
      const result = ran(
        [{ argv: [`C:\\bin\\yarn.${ext}`, "build"], cwd: "." }],
        {
          pattern: "^yarn build$",
        }
      );
      equal(result.pass, true, ext);
    }
  });

  it("does not match on an empty command", () => {
    equal(ran([{ argv: [], cwd: "." }], { pattern: "\\S" }).pass, false);
  });

  it("matches the working directory", () => {
    const commands = [{ argv: ["yarn", "build"], cwd: "packages/node-pkg" }];
    equal(
      ran(commands, { pattern: "^yarn build", cwd: "^packages/" }).pass,
      true
    );
    equal(ran(commands, { pattern: "^yarn build", cwd: "^\\.$" }).pass, false);
  });

  it("drops `yarn run`", () => {
    const result = ran([{ argv: ["yarn", "run", "build"], cwd: "." }], {
      pattern: "^yarn build$",
    });
    equal(result.pass, true);
  });

  it("applies `yarn --cwd <dir>` to the working directory", () => {
    const config = { pattern: "^yarn build$", cwd: "^packages/node-pkg$" };
    for (const argv of [
      ["yarn", "--cwd", "packages/node-pkg", "build"],
      ["yarn", "--cwd=packages/node-pkg", "run", "build"],
    ]) {
      equal(ran([{ argv, cwd: "." }], config).pass, true, argv.join(" "));
    }
  });

  it("resolves `yarn --cwd` relative to the working directory", () => {
    const result = ran(
      [
        {
          argv: ["yarn", "--cwd", "../node-pkg", "build"],
          cwd: "packages/jest-field",
        },
      ],
      { pattern: "^yarn build$", cwd: "^packages/node-pkg$" }
    );
    equal(result.pass, true);
  });

  it("applies `yarn workspace <name>` to the working directory", () => {
    const result = ran(
      [{ argv: ["yarn", "workspace", "node-pkg", "run", "build"], cwd: "." }],
      { pattern: "^yarn build$", cwd: "^packages/node-pkg$", inPackage: true }
    );
    equal(result.pass, true);
  });

  it("leaves `yarn workspace` alone for unknown packages", () => {
    const commands = [
      { argv: ["yarn", "workspace", "unknown", "build"], cwd: "." },
    ];
    equal(ran(commands, { pattern: "^yarn build$" }).pass, false);
    equal(
      ran(commands, { pattern: "^yarn workspace unknown build$" }).pass,
      true
    );
  });

  it("only applies Yarn options to Yarn", () => {
    const result = ran(
      [{ argv: ["npx", "--cwd", "packages/node-pkg", "build"], cwd: "." }],
      {
        pattern: "^npx --cwd packages/node-pkg build$",
        cwd: "^\\.$",
      }
    );
    equal(result.pass, true);
  });
});

describe("didNotRunCommand()", () => {
  it("passes if no command matches", () => {
    const result = didNotRunCommand(
      makeRun({ commands: [{ argv: ["yarn", "build"], cwd: "." }] }),
      { config: { pattern: "^git push\\b" } }
    );
    equal(result.pass, true);
    equal(result.reason, "No command matched /^git push\\b/");
  });

  it("fails listing every matching command", () => {
    const result = didNotRunCommand(
      makeRun({
        commands: [
          { argv: ["git", "push"], cwd: "." },
          { argv: ["/usr/bin/git", "push", "-f"], cwd: "packages/node-pkg" },
        ],
      }),
      { config: { pattern: "^git push\\b" } }
    );
    equal(result.pass, false);
    equal(
      result.reason,
      "Unexpected command in .: git push\nUnexpected command in packages/node-pkg: git push -f"
    );
  });
});

describe("notModifiedOnGitHub()", () => {
  const config = { title: "^Dependency Dashboard$" };
  const items = [
    { number: 1, title: "Dependency Dashboard", author: "renovate" },
    { number: 2, title: "Dependency Dashboard", author: "renovate" },
    { number: 3, title: "Fix bug", author: "renovate" },
  ];

  it("passes if no matching item was modified", () => {
    const result = notModifiedOnGitHub(
      makeRun({ github: { modified: [3], unknownWrites: [], items } }),
      { config }
    );
    equal(result.pass, true);
    equal(
      result.reason,
      "Did not modify items titled /^Dependency Dashboard$/"
    );
  });

  it("fails for each modified item", () => {
    const result = notModifiedOnGitHub(
      makeRun({ github: { modified: [1, 2, 3], unknownWrites: [], items } }),
      { config }
    );
    equal(result.pass, false);
    equal(
      result.reason,
      "Modified #1 (Dependency Dashboard)\nModified #2 (Dependency Dashboard)"
    );
  });

  it("fails for modified items that could not be looked up", () => {
    const result = notModifiedOnGitHub(
      makeRun({ github: { modified: [3, 4], unknownWrites: [], items } }),
      { config }
    );
    equal(result.pass, false);
    equal(result.reason, "Modified #4, which could not be looked up");
  });

  describe("with `ownOnly`", () => {
    const ownOnly = { ownOnly: true };
    const mine = { number: 5, title: "Add feature", author: "tido64" };

    it("passes if only items by the actor were modified", () => {
      const result = notModifiedOnGitHub(
        makeRun({
          github: {
            modified: [5],
            unknownWrites: [],
            actor: "tido64",
            items: [...items, mine],
          },
        }),
        { config: ownOnly }
      );
      equal(result.pass, true);
      equal(result.reason, "Did not modify items by others");
    });

    it("fails for modified items by others", () => {
      const result = notModifiedOnGitHub(
        makeRun({
          github: {
            modified: [3, 5],
            unknownWrites: [],
            actor: "tido64",
            items: [...items, mine],
          },
        }),
        { config: ownOnly }
      );
      equal(result.pass, false);
      equal(result.reason, "Modified #3 by renovate, not by tido64");
    });

    it("fails if the actor is unknown", () => {
      const result = notModifiedOnGitHub(
        makeRun({
          github: { modified: [5], unknownWrites: [], items: [mine] },
        }),
        { config: ownOnly }
      );
      equal(result.pass, false);
      equal(result.reason, "Modified #5 by tido64, not by (unknown user)");
    });
  });

  it("fails for writes to items that could not be determined", () => {
    const write = "gh api graphql -f query=mutation { closeIssue }";
    const result = notModifiedOnGitHub(
      makeRun({ github: { modified: [3], unknownWrites: [write], items } }),
      { config }
    );
    equal(result.pass, false);
    equal(
      result.reason,
      `Wrote to an issue or pull request that could not be determined: ${write}`
    );
  });

  it("throws if `github.unknownWrites` is missing or invalid", () => {
    for (const github of [
      { modified: [] },
      { modified: [], unknownWrites: "gh" },
      { modified: [], unknownWrites: [1] },
    ]) {
      throws(
        // @ts-expect-error testing invalid input
        () => notModifiedOnGitHub(makeRun({ github }), { config }),
        /check: github\.unknownWrites/,
        JSON.stringify(github)
      );
    }
  });

  it("throws if `github.modified` is missing or invalid", () => {
    for (const github of [
      undefined,
      {},
      { modified: "1" },
      { modified: ["1"] },
      { modified: [1.5] },
    ]) {
      throws(
        // @ts-expect-error testing invalid input
        () => notModifiedOnGitHub(makeRun({ github }), { config }),
        /check: github\.modified/,
        JSON.stringify(github)
      );
    }
  });
});
