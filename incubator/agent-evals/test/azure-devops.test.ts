import { deepEqual, equal, throws } from "node:assert/strict";
import { execFile } from "node:child_process";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as path from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  azureDevOpsWrites,
  parseRepository,
} from "../src/provider/azure-devops.ts";
import type { SessionToolCall } from "../src/provider/session.ts";
import { parseShellInput } from "../src/provider/shell.ts";

const REPOSITORY = "org/My Project/repo";

function writes(
  input: string,
  toolCalls: SessionToolCall[] = []
): ReturnType<typeof azureDevOpsWrites> {
  const commands = parseShellInput(input).map((argv) => ({ argv, cwd: "." }));
  return azureDevOpsWrites(REPOSITORY, toolCalls, commands);
}

function call(name: string, args: Record<string, unknown>): SessionToolCall {
  return { name, arguments: args };
}

describe("parseRepository()", () => {
  it("parses HTTPS URLs", () => {
    for (const url of [
      "https://dev.azure.com/org/My%20Project/_git/repo",
      "https://org@dev.azure.com/org/My%20Project/_git/repo/",
      "https://org.visualstudio.com/My%20Project/_git/repo",
      "https://org.visualstudio.com/DefaultCollection/My%20Project/_git/repo",
    ]) {
      equal(parseRepository(url), REPOSITORY, url);
    }
  });

  it("parses SSH URLs", () => {
    for (const url of [
      "git@ssh.dev.azure.com:v3/org/My%20Project/repo",
      "ssh://git@ssh.dev.azure.com:22/v3/org/My%20Project/repo",
      "org@vs-ssh.visualstudio.com:v3/org/My%20Project/repo",
    ]) {
      equal(parseRepository(url), REPOSITORY, url);
    }
  });

  it("uses the repository as project if there is none", () => {
    equal(
      parseRepository("https://dev.azure.com/org/_git/expos%C3%A9"),
      "org/exposé/exposé"
    );
    equal(
      parseRepository("https://org.visualstudio.com/_git/repo"),
      "org/repo/repo"
    );
  });

  it("returns `undefined` for other URLs", () => {
    for (const url of [
      "https://github.com/microsoft/rnx-kit.git",
      "git@github.com:microsoft/rnx-kit.git",
      "https://dev.azure.com/org/project/_git/repo%2Fname",
      "https://dev.azure.com/org/project/_git/%E0",
    ]) {
      equal(parseRepository(url), undefined, url);
    }
  });
});

describe("azureDevOpsWrites()", () => {
  it("throws on invalid repositories", () => {
    throws(() => azureDevOpsWrites("owner/repo", [], []), {
      message:
        "Invalid Azure DevOps repository 'owner/repo'; expected 'organization/project/repository'",
    });
  });

  it("finds writes through MCP tools, with any server prefix", () => {
    const { modified, unknownWrites } = writes("", [
      call("ado-repo_pull_request_write", { action: "vote", pullRequestId: 1 }),
      call("mcp__ado__repo_pull_request_thread_write", {
        action: "reply",
        pullRequestId: "2",
      }),
      {
        ...call("x", { action: "update", id: 3 }),
        serverTool: "wit_work_item_write",
      },
      call("wit_work_item_write", {
        action: "update_batch",
        batchUpdates: [{ id: 4 }, { id: 5 }],
      }),
      call("wit_work_item_comment_write", { action: "add", workItemId: 6 }),
      call("wit_work_item_link_write", {
        action: "link_to_pull_request",
        workItemId: 7,
        pullRequestId: 8,
      }),
      call("wit_work_item_attachment_link", { workItemId: 9 }),
      call("testplan_test_case_write", { action: "update_steps", id: 10 }),
    ]);
    deepEqual(modified, [
      "!1",
      "!2",
      "!8",
      "#3",
      "#4",
      "#5",
      "#6",
      "#7",
      "#9",
      "#10",
    ]);
    deepEqual(unknownWrites, []);
  });

  it("skips MCP reads, creates and pull requests in other repositories", () => {
    const { modified, unknownWrites } = writes("", [
      call("ado-repo_pull_request", { action: "get", pullRequestId: 1 }),
      call("ado-repo_pull_request_write", { action: "create" }),
      call("ado-wit_work_item_write", { action: "create" }),
      call("ado-repo_pull_request_write", {
        action: "vote",
        pullRequestId: 2,
        repositoryId: "other",
      }),
      call("ado-repo_pull_request_write", {
        action: "vote",
        pullRequestId: 3,
        project: "Other",
      }),
      call("ado-repo_pull_request_write", {
        action: "vote",
        pullRequestId: 4,
        project: "my project",
        repositoryId: "0f6a4f5e-2b9e-4a59-9c8e-3c7e8b1f2a10",
      }),
      call("ado-wit_work_item_write", { action: "update" }),
    ]);
    deepEqual(modified, ["!4"]);
    deepEqual(unknownWrites, ['ado-wit_work_item_write {"action":"update"}']);
  });

  it("finds writes through `az`", () => {
    const input = [
      "az repos pr update --id 1 --title Fix",
      "az repos pr set-vote --id=2 --vote approve",
      "az repos pr reviewer add --id 3 --reviewers bob",
      "az repos pr work-item add --id 4 --work-items 5 6",
      "az boards work-item update --id 7 --state Done",
      "az boards work-item relation add --id 8 --relation-type parent --target-id 9",
      "az boards work-item delete --id 10 --yes",
      "az repos pr update --id 11 --org https://dev.azure.com/org/",
      "az repos pr update --id 12 --organization https://ORG.visualstudio.com",
    ].join("\n");
    deepEqual(writes(input).modified, [
      "!1",
      "!2",
      "!3",
      "!4",
      "!11",
      "!12",
      "#5",
      "#6",
      "#7",
      "#8",
      "#10",
    ]);
  });

  it("skips `az` reads, creates and other organizations", () => {
    const input = [
      "az repos pr show --id 1",
      "az repos pr checkout --id 2",
      "az repos pr reviewer list --id 3",
      "az repos pr create --title Fix",
      "az boards work-item show --id 4",
      "az boards work-item relation show --id 5",
      "az boards work-item create --title Bug --type Bug",
      "az repos pr update --id 6 --org https://dev.azure.com/other",
      "az repos list",
      "/usr/bin/az.cmd boards work-item update --id 7",
    ].join("\n");
    const { modified, unknownWrites } = writes(input);
    deepEqual(modified, ["#7"]);
    deepEqual(unknownWrites, []);
  });

  it("finds writes through `az devops invoke`", () => {
    const input = [
      "az devops invoke --area git --resource pullRequestThreads --route-parameters project=p repositoryId=r pullRequestId=1 --http-method POST",
      "az devops invoke --area wit --resource workItems --route-parameters id=2 --http-method patch",
      "az devops invoke --area git --resource pullRequests --route-parameters pullRequestId=3",
      "az devops invoke --area core --resource projects --http-method DELETE",
    ].join("\n");
    deepEqual(writes(input), {
      modified: ["!1", "#2"],
      unknownWrites: [
        "az devops invoke --area core --resource projects --http-method DELETE",
      ],
    });
  });
});

type Route = { status: number; body?: unknown; location?: string };

describe(
  "getPullRequest() and lookUp()",
  { skip: process.platform === "win32" },
  () => {
    const ANONYMOUS_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const PROJECT = "/org/My%20Project/_apis";

    let routes: Record<string, Route>;
    let authorizations: (string | undefined)[];
    let server: http.Server;
    let apiUrl: string;

    before(async () => {
      server = http.createServer((req, res) => {
        authorizations.push(req.headers.authorization);
        const { pathname } = new URL(req.url ?? "/", apiUrl);
        const { status, body, location } = routes[pathname] ?? { status: 404 };
        res.writeHead(status, location ? { Location: location } : {});
        res.end(body === undefined ? "" : JSON.stringify(body));
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "localhost", resolve)
      );
      const { port } = server.address() as AddressInfo;
      apiUrl = `http://localhost:${port}`;
    });

    after(() => {
      server.close();
    });

    beforeEach(() => {
      authorizations = [];
      routes = {
        "/org/_apis/connectionData": {
          status: 200,
          body: { authenticatedUser: { id: "user-1" } },
        },
        [`${PROJECT}/git/repositories/repo/pullrequests/1`]: {
          status: 200,
          body: {
            title: "Fix bug",
            sourceRefName: "refs/heads/feature/fix",
            targetRefName: "refs/heads/main",
            lastMergeSourceCommit: { commitId: "abc123" },
            createdBy: { id: "user-2" },
          },
        },
        // Unauthorized requests are redirected to the sign-in page
        [`${PROJECT}/git/repositories/repo/pullrequests/2`]: {
          status: 302,
          location: "/signin",
        },
        "/signin": { status: 200, body: {} },
        [`${PROJECT}/wit/workitems/3`]: {
          status: 200,
          body: {
            fields: {
              "System.Title": "Bug",
              "System.CreatedBy": { id: "user-1" },
            },
          },
        },
      };
    });

    /**
     * Runs `getPullRequest()` and `lookUp()` in a separate process, where
     * credentials are read from the specified environment.
     */
    async function run(env: Record<string, string>): Promise<unknown> {
      const module = fileURLToPath(
        new URL("../src/provider/azure-devops.ts", import.meta.url)
      );
      const script = [
        `import { getPullRequest, lookUp } from ${JSON.stringify(module)};`,
        `const repo = ${JSON.stringify(REPOSITORY)};`,
        `const apiUrl = ${JSON.stringify(apiUrl)};`,
        "const pullRequests = [await getPullRequest(repo, 1, apiUrl), await getPullRequest(repo, 2, apiUrl) ?? null];",
        `const lookedUp = await lookUp(repo, ["!1", "!2", "#3", "#4"], apiUrl);`,
        "console.log(JSON.stringify({ pullRequests, lookedUp }));",
      ].join("\n");
      const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--input-type=module", "--eval", script],
        { encoding: "utf-8", env }
      );
      return JSON.parse(stdout);
    }

    it("looks up pull requests and work items with a personal access token", async () => {
      const result = await run({ PATH: "", AZURE_DEVOPS_EXT_PAT: "pat" });
      deepEqual(result, {
        pullRequests: [
          {
            id: "1",
            base: "refs/heads/main",
            head: "abc123",
            branch: "feature/fix",
          },
          null,
        ],
        lookedUp: {
          actor: "user-1",
          items: [
            { ref: "!1", title: "Fix bug", author: "user-2" },
            { ref: "#3", title: "Bug", author: "user-1" },
          ],
        },
      });
      const basic = `Basic ${Buffer.from(":pat").toString("base64")}`;
      deepEqual(new Set(authorizations), new Set([basic]));
    });

    it("falls back to a token from the Azure CLI", async () => {
      const bin = fileURLToPath(new URL("__fixtures__/az", import.meta.url));
      const node = path.dirname(process.execPath);
      await run({ PATH: `${bin}${path.delimiter}${node}` });
      deepEqual(new Set(authorizations), new Set(["Bearer az-token"]));
    });

    it("omits the actor if anonymous", async () => {
      routes["/org/_apis/connectionData"] = {
        status: 200,
        body: { authenticatedUser: { id: ANONYMOUS_ID } },
      };
      const { lookedUp } = (await run({ PATH: "" })) as {
        lookedUp: Record<string, unknown>;
      };
      equal(lookedUp["actor"], undefined);
      deepEqual(new Set(authorizations), new Set([undefined]));
    });
  }
);
