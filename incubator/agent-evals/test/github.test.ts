import { deepEqual, equal } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { notModifiedOnGitHub } from "../src/commands.ts";
import { gitHubWrites } from "../src/provider/github.ts";
import type { SessionToolCall } from "../src/provider/session.ts";
import { parseShellInput } from "../src/provider/shell.ts";
import { makeRun } from "./helpers.ts";

function writes(
  input: string,
  toolCalls: SessionToolCall[] = []
): ReturnType<typeof gitHubWrites> {
  const commands = parseShellInput(input).map((argv) => ({ argv, cwd: "." }));
  return gitHubWrites("microsoft/rnx-kit", toolCalls, commands);
}

function modified(input: string): number[] {
  return writes(input).modified;
}

describe("gitHubWrites()", () => {
  it("skips the values of flags before the number", () => {
    const input = [
      "gh pr comment -F body.md 1",
      "gh pr close -c done 2",
      "gh issue close -r completed 3",
      "gh pr edit --add-reviewer bob 4",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3, 4]);
  });

  it("handles flags that only take a value in some commands", () => {
    const input =
      "gh pr merge -s -d 1; gh pr review -a 2; gh issue develop -c 3";
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("treats all but read-only subcommands as writes", () => {
    const input = [
      "gh issue view 1",
      "gh pr checks 2",
      "gh pr diff 3",
      "gh pr revert 4",
      "gh issue pin 5",
    ].join("\n");
    deepEqual(modified(input), [4, 5]);
  });

  it("reads the repository in any form", () => {
    const input = [
      "gh pr comment -R microsoft/rnx-kit 1",
      "gh pr comment --repo=microsoft/rnx-kit 2",
      "gh pr comment -Rmicrosoft/rnx-kit 3",
      "gh pr comment -Rfork/rnx-kit 4",
      "gh pr comment --repo fork/rnx-kit 5",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("accepts issue and pull request URLs", () => {
    const input = [
      "gh issue comment https://github.com/microsoft/rnx-kit/issues/1",
      "gh pr review https://github.com/microsoft/rnx-kit/pull/2/files",
      "gh pr close '#3'",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("does not mistake flag values for the number", () => {
    const input = [
      "gh issue close --duplicate-of 9 1",
      'gh pr comment --body "Fixed in https://github.com/microsoft/rnx-kit/pull/9" 2',
      "gh pr comment -- 3",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("detects the method and fields of `gh api` in any form", () => {
    const input = [
      "gh api --method=PATCH repos/microsoft/rnx-kit/issues/1",
      "gh api -XPATCH repos/microsoft/rnx-kit/issues/2",
      "gh api --field=body=x repos/{owner}/{repo}/issues/3/comments",
      "gh api -fbody=x repos/microsoft/rnx-kit/issues/4/comments",
      "gh api repos/microsoft/rnx-kit/issues/5",
      "gh api -H 'Accept: x' -X DELETE /repos/microsoft/rnx-kit/issues/6/lock",
      "gh api -X POST repos/fork/rnx-kit/issues/7/comments",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3, 4, 6]);
  });

  it("strips the host from `gh api` endpoints", () => {
    const input = [
      "gh api -X PATCH https://api.github.com/repos/microsoft/rnx-kit/issues/1",
      "gh api -X PATCH https://github.example.com/api/v3/repos/microsoft/rnx-kit/issues/2",
      "gh api -X PATCH https://api.github.com/repos/fork/rnx-kit/issues/3",
    ].join("\n");
    deepEqual(writes(input), { modified: [1, 2], unknownWrites: [] });
  });

  it("treats GraphQL mutations as unknown writes", () => {
    const mutation =
      "query=mutation { closeIssue(input: {}) { clientMutationId } }";
    const input = [
      `gh api graphql -f '${mutation}'`,
      `gh api https://api.github.com/graphql -f '${mutation}'`,
      "gh api graphql -f 'query=query { viewer { login } }'",
    ].join("\n");
    deepEqual(writes(input), {
      modified: [],
      unknownWrites: [
        `gh api graphql -f ${mutation}`,
        `gh api https://api.github.com/graphql -f ${mutation}`,
      ],
    });
  });

  it("treats writes to comments by ID as unknown writes", () => {
    const input = [
      "gh api -X PATCH repos/{owner}/{repo}/issues/comments/1 -f body=x",
      "gh api -X DELETE repos/microsoft/rnx-kit/pulls/comments/2",
      "gh api repos/microsoft/rnx-kit/issues/comments/3",
      "gh api -X DELETE repos/fork/rnx-kit/issues/comments/4",
    ].join("\n");
    deepEqual(writes(input), {
      modified: [],
      unknownWrites: [
        "gh api -X PATCH repos/{owner}/{repo}/issues/comments/1 -f body=x",
        "gh api -X DELETE repos/microsoft/rnx-kit/pulls/comments/2",
      ],
    });
  });

  it("attributes writes without a number to the pull request checked out last", () => {
    const input = [
      "gh pr comment -b 'Before checkout'",
      "gh pr checkout 1",
      "gh pr comment -b 'Looks good'",
      "gh pr create -t 'New PR'",
      "gh issue comment -b 'Not a PR'",
      "gh pr checkout -R fork/rnx-kit 2",
      "gh pr edit --add-label bug",
      "gh pr co 3",
      "gh pr review -a",
      "gh pr checkout feature-branch",
      "gh pr merge -s",
    ].join("\n");
    deepEqual(writes(input), {
      modified: [1, 3],
      unknownWrites: ["gh pr merge -s"],
    });
  });

  it("treats GraphQL calls other than inline queries as unknown writes", () => {
    const input = [
      "gh api graphql -F query=@m.graphql",
      "gh api graphql --input mutation.json",
      "gh api graphql --input query.json",
      "gh api graphql -F 'query=# comment\n  { viewer { login } }'",
      "gh api graphql --raw-field='query=query { viewer { login } }'",
      "gh api graphql -f 'query=query { a }' -f 'query=mutation { b }'",
      "gh api graphql -f owner=microsoft",
      "gh api graphql -f 'query=query A { viewer { login } } mutation B { addComment(input: {}) { clientMutationId } }' -f operationName=B",
      `gh api graphql -f 'query=query A { x(p: "#") { id } } mutation B { addComment(input: {}) { clientMutationId } }' -f operationName=B`,
      `gh api graphql -f 'query=query A { x(p: """ " # """) { id } } mutation B { addComment(input: {}) { clientMutationId } }' -f operationName=B`,
      `gh api graphql -f 'query=query { x(path: "src/mutation.ts", p: "\\"", q: """ \\""" mutation """) { id } } # "mutation"'`,
    ].join("\n");
    deepEqual(writes(input), {
      modified: [],
      unknownWrites: [
        "gh api graphql -F query=@m.graphql",
        "gh api graphql --input mutation.json",
        "gh api graphql --input query.json",
        "gh api graphql -f query=query { a } -f query=mutation { b }",
        "gh api graphql -f owner=microsoft",
        "gh api graphql -f query=query A { viewer { login } } mutation B { addComment(input: {}) { clientMutationId } } -f operationName=B",
        'gh api graphql -f query=query A { x(p: "#") { id } } mutation B { addComment(input: {}) { clientMutationId } } -f operationName=B',
        'gh api graphql -f query=query A { x(p: """ " # """) { id } } mutation B { addComment(input: {}) { clientMutationId } } -f operationName=B',
      ],
    });
  });

  it("treats writes without a number after checking out a branch as unknown writes", () => {
    const input = "gh pr checkout some/branch; gh pr comment --body hi";
    deepEqual(writes(input), {
      modified: [],
      unknownWrites: ["gh pr comment --body hi"],
    });
  });

  it("does not attribute writes after `gh pr create` to the pull request checked out before", () => {
    const input = [
      "gh pr checkout 5",
      "gh pr create --fill",
      "gh pr edit --add-label x",
    ].join("\n");
    deepEqual(writes(input), { modified: [], unknownWrites: [] });
  });

  it("does not attribute writes after switching branches to the pull request checked out before", () => {
    const sequences = [
      "gh pr checkout 5; git switch main; gh pr comment --body hi",
      "gh pr checkout 5; git -C . switch main; gh pr comment --body hi",
      "gh pr checkout 5; git -c a=b --no-pager -P --git-dir=.git --work-tree=. switch main; gh pr comment --body hi",
      "gh pr checkout 5; git --git-dir .git --work-tree . switch main; gh pr comment --body hi",
      "gh pr checkout 5; git checkout -b fix; gh pr comment --body hi",
      "gh pr checkout 5; git checkout -B fix origin/main; gh pr comment --body hi",
      "gh pr checkout 5; git checkout --orphan fix; gh pr comment --body hi",
      "gh pr checkout 5; git checkout --orphan=fix; gh pr comment --body hi",
      "gh pr checkout some/branch; git switch -; gh pr comment --body hi",
    ];
    for (const input of sequences) {
      deepEqual(writes(input), { modified: [], unknownWrites: [] }, input);
    }
  });

  it("treats writes without a number after `git checkout <arg>` as unknown writes", () => {
    const sequences = [
      "gh pr checkout 5; git checkout src/a.ts; gh pr comment --body hi",
      "gh pr checkout 5; git checkout main; gh pr comment --body hi",
      "gh pr checkout 5; git -C . checkout main; gh pr comment --body hi",
    ];
    for (const input of sequences) {
      deepEqual(
        writes(input),
        { modified: [], unknownWrites: ["gh pr comment --body hi"] },
        input
      );
    }
  });

  it("keeps the pull request checked out when restoring files", () => {
    const input = [
      "gh pr checkout 5",
      "git checkout -- README.md",
      "git checkout main -- package.json",
      "git -C . checkout -- README.md",
      "git checkout",
      "git status",
      "gh pr comment --body hi",
    ].join("\n");
    deepEqual(writes(input), { modified: [5], unknownWrites: [] });
  });

  it("recognizes `gh` with Windows extensions", () => {
    const input = [
      "gh.exe pr close 1",
      "'C:\\Program Files\\GitHub CLI\\gh.cmd' pr close 2",
      "ghx pr close 3",
    ].join("\n");
    deepEqual(modified(input), [1, 2]);
  });

  it("treats MCP writes to comments by ID as unknown writes", () => {
    const toolCalls: SessionToolCall[] = [
      {
        name: "update_issue_comment",
        arguments: { owner: "microsoft", repo: "rnx-kit", comment_id: 1 },
        server: "github-mcp-server",
        serverTool: "update_issue_comment",
      },
      {
        name: "github-mcp-server-add_reply_to_pull_request_comment",
        arguments: { owner: "microsoft", repo: "rnx-kit", commentId: 2 },
      },
      {
        name: "github-mcp-server-add_reply_to_pull_request_comment",
        arguments: { owner: "microsoft", repo: "rnx-kit", pullNumber: 3 },
      },
      {
        name: "github-mcp-server-update_issue_comment",
        arguments: { owner: "fork", repo: "rnx-kit", comment_id: 4 },
      },
    ];
    deepEqual(writes("", toolCalls), {
      modified: [3],
      unknownWrites: [
        'update_issue_comment {"owner":"microsoft","repo":"rnx-kit","comment_id":1}',
        'github-mcp-server-add_reply_to_pull_request_comment {"owner":"microsoft","repo":"rnx-kit","commentId":2}',
      ],
    });
  });

  it("catches writes to a foreign pull request checked out on the session's branch", () => {
    const github = {
      ...writes("gh pr checkout 5\ngh pr comment -b 'Fixed'"),
      actor: "tido64",
      items: [{ number: 5, title: "Fix bug", author: "contributor" }],
    };
    const result = notModifiedOnGitHub(makeRun({ github }), {
      config: { ownOnly: true },
    });
    equal(result.pass, false);
    equal(result.reason, "Modified #5 by contributor, not by tido64");
  });
});

describe("lookUp()", { skip: process.platform === "win32" }, () => {
  it("takes the actor from the authenticated user", () => {
    // `gh` is replaced by a fixture; it is resolved when the module is loaded
    const bin = fileURLToPath(new URL("__fixtures__/gh", import.meta.url));
    const github = fileURLToPath(
      new URL("../src/provider/github.ts", import.meta.url)
    );
    const script = [
      `import { lookUp } from ${JSON.stringify(github)};`,
      `console.log(JSON.stringify(await lookUp("microsoft/rnx-kit", [1, 2, 3])));`,
    ].join("\n");
    const { stdout, stderr, status } = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      {
        encoding: "utf-8",
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env["PATH"]}`,
        },
      }
    );
    equal(status, 0, stderr);
    deepEqual(JSON.parse(stdout), {
      actor: "tido64",
      items: [
        { number: 1, title: "Fix bug", author: "contributor" },
        { number: 2, title: "Spam", author: "ghost" },
      ],
    });
  });
});
