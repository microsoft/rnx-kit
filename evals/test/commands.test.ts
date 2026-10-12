import { equal, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  didNotRunCommand,
  notModifiedOnGitHub,
  noToolCall,
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

  it("matches only commands run in a workspace package with `inPackage`", () => {
    const config = { pattern: "^yarn build$", inPackage: true };
    for (const cwd of ["packages/node-pkg", "packages/jest-field"]) {
      equal(ran([{ argv: ["yarn", "build"], cwd }], config).pass, true, cwd);
    }
    for (const cwd of [
      ".",
      "packages",
      "packages/node-pkg/src",
      "packages/node-pkg/test/__fixtures__/nested",
      "packages/unnamed",
    ]) {
      equal(ran([{ argv: ["yarn", "build"], cwd }], config).pass, false, cwd);
    }
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

describe("noToolCall()", () => {
  const toolCalls = [
    { name: "github-mcp-server-get_issue", arguments: { issue: 1 } },
    { name: "github-mcp-server-add_issue_comment", arguments: { issue: 1 } },
  ];

  it("passes if no tool call matches", () => {
    const result = noToolCall(makeRun({ toolCalls }), {
      config: { name: "merge_pull_request" },
    });
    equal(result.pass, true);
  });

  it("fails listing every matching tool call", () => {
    const result = noToolCall(makeRun({ toolCalls }), {
      config: { name: "_issue" },
    });
    equal(result.pass, false);
    equal(
      result.reason,
      [
        'Unexpected tool call: github-mcp-server-get_issue {"issue":1}',
        'Unexpected tool call: github-mcp-server-add_issue_comment {"issue":1}',
      ].join("\n")
    );
  });
});

describe("notModifiedOnGitHub()", () => {
  const config = { numbers: [1, 2] };

  it("passes if none of the numbers were modified", () => {
    const result = notModifiedOnGitHub(makeRun({ github: { modified: [3] } }), {
      config,
    });
    equal(result.pass, true);
    equal(result.reason, "Did not modify #1, #2");
  });

  it("fails for each modified number", () => {
    const result = notModifiedOnGitHub(
      makeRun({ github: { modified: [2, 1, 3] } }),
      { config }
    );
    equal(result.pass, false);
    equal(result.reason, "Modified #1\nModified #2");
  });

  it("throws if the GitHub mock state is missing or invalid", () => {
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
