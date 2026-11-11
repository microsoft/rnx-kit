import { deepEqual, equal, rejects } from "node:assert/strict";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import { readGitHubSessions } from "../src/provider/github-sessions.ts";

type Response = { status: number; body: unknown };

describe("readGitHubSessions()", () => {
  const PR_ID = "42";
  const TOKEN = "token";

  /** Responses by path; arrays are returned in order, then the last again */
  let routes: Record<string, Response | Response[]>;
  let requests: string[];
  let server: http.Server;
  let apiUrl: string;

  // `Error.isError` was added in Node 24
  const missingIsError = !("isError" in Error);

  function read(): ReturnType<typeof readGitHubSessions> {
    return readGitHubSessions("microsoft/rnx-kit", PR_ID, TOKEN, apiUrl);
  }

  function ok(body: unknown): Response {
    return { status: 200, body };
  }

  function sessions(...ids: [string, number][]): Response {
    return ok({
      session_count: ids.length,
      sessions: ids.map(([id, last_updated_at]) => ({ id, last_updated_at })),
    });
  }

  function events(...events: unknown[]): Response {
    return ok({ events, total: events.length });
  }

  function request(content: string): unknown[] {
    return [
      { type: "user.message", data: { content } },
      { type: "assistant.message", data: { content: `Done: ${content}` } },
    ];
  }

  before(async () => {
    if (missingIsError) {
      Error.isError = (e: unknown) => e instanceof Error;
    }
    server = http.createServer((req, res) => {
      const url = req.url ?? "";
      requests.push(url);
      const route = routes[url];
      const response = Array.isArray(route)
        ? route.length > 1
          ? route.shift()
          : route[0]
        : route;
      const { status, body } = response ?? { status: 404, body: "Not Found" };
      const ok =
        req.headers.authorization === `Bearer ${TOKEN}` &&
        req.headers["copilot-integration-id"] === "copilot-4-cli";
      res.writeHead(ok ? status : 401);
      res.end(typeof body === "string" ? body : JSON.stringify(body));
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "localhost", resolve)
    );
    const { port } = server.address() as AddressInfo;
    apiUrl = `http://localhost:${port}`;
  });

  after(() => {
    if (missingIsError) {
      Error.isError = undefined;
    }
    server.close();
  });

  beforeEach(() => {
    routes = {};
    requests = [];
  });

  it("joins the first request of each session, in order", async () => {
    const start = {
      type: "session.start",
      data: { context: { gitRoot: "/work", cwd: "/work/packages/a" } },
    };
    const bash = {
      type: "tool.execution_start",
      data: { toolCallId: "1", toolName: "bash", arguments: { command: "ls" } },
    };
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: sessions(["b", 2], ["a", 1]),
      "/agents/sessions/a/events": events(
        start,
        ...request("Fix the bug"),
        bash,
        bash,
        // Written by the agent itself, e.g. for the pull request description
        ...request("Describe the changes")
      ),
      "/agents/sessions/b/events": events(...request("Add a test")),
    };

    const session = await read();

    equal(session.id, "a,b");
    equal(session.root, "/work");
    equal(session.cwd, "/work/packages/a");
    deepEqual(session.shellInputs, ["ls"]);
    deepEqual(session.requests, [
      { prompt: "Fix the bug", reply: "Done: Fix the bug" },
      { prompt: "Add a test", reply: "Done: Add a test" },
    ]);
    deepEqual(requests, [
      `/agents/resource/pull/${PR_ID}`,
      "/agents/sessions/a/events",
      "/agents/sessions/b/events",
    ]);
  });

  it("works in the runner's checkout if the session did not say", async () => {
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: sessions(["a", 1]),
      "/agents/sessions/a/events": events(...request("Fix the bug")),
    };

    const session = await read();

    equal(session.root, "/home/runner/work/rnx-kit/rnx-kit");
    equal(session.cwd, "/home/runner/work/rnx-kit/rnx-kit");
  });

  it("retries transient errors", async () => {
    const transient = {
      status: 400,
      body: "bad request: unknown Copilot-Integration-Id",
    };
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: sessions(["a", 1]),
      "/agents/sessions/a/events": [transient, events(...request("Fix"))],
    };

    const session = await read();

    deepEqual(session.requests, [{ prompt: "Fix", reply: "Done: Fix" }]);
    equal(requests.length, 3);
  });

  it("throws if the token cannot read the sessions", async () => {
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: {
        status: 400,
        body: "the Copilot-Integration-Id header does not match the GitHub App that issued this installation access token",
      },
    };

    await rejects(read(), {
      message:
        "the token cannot read Copilot cloud agent sessions; a user token with Copilot access is required",
    });
  });

  it("throws if the pull request has no sessions", async () => {
    await rejects(read(), {
      message:
        "no Copilot cloud agent sessions were found, or the token cannot read them",
    });

    routes = { [`/agents/resource/pull/${PR_ID}`]: ok({ sessions: [] }) };
    await rejects(read(), {
      message: "no Copilot cloud agent sessions were found",
    });
  });

  it("throws if sessions or events are missing", async () => {
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: ok({
        session_count: 2,
        sessions: [{ id: "a", last_updated_at: 1 }],
      }),
    };

    await rejects(read(), {
      message: "Pull request returned 1 of 2 sessions",
    });

    routes = {
      [`/agents/resource/pull/${PR_ID}`]: sessions(["a", 1]),
      "/agents/sessions/a/events": ok({ events: [], total: 3 }),
    };

    await rejects(read(), { message: "Session a returned 0 of 3 events" });
  });

  it("throws other errors with the response", async () => {
    routes = {
      [`/agents/resource/pull/${PR_ID}`]: sessions(["a", 1]),
      "/agents/sessions/a/events": { status: 422, body: "Unprocessable" },
    };

    await rejects(read(), {
      message: `${apiUrl}/agents/sessions/a/events: 422 Unprocessable`,
    });
  });
});
