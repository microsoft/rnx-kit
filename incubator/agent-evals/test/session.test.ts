import { deepEqual, equal, throws } from "node:assert/strict";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyEvents,
  newSession,
  readSession,
} from "../src/provider/session.ts";

describe("readSession()", () => {
  const copilotHome = process.env["COPILOT_HOME"];
  // `Error.isError` was added in Node 24
  const missingIsError = !("isError" in Error);

  before(() => {
    if (missingIsError) {
      Error.isError = (e: unknown) => e instanceof Error;
    }
    process.env["COPILOT_HOME"] = fileURLToPath(
      new URL("__fixtures__/copilot", import.meta.url)
    );
  });

  after(() => {
    if (missingIsError) {
      Error.isError = undefined;
    }
    if (copilotHome === undefined) {
      delete process.env["COPILOT_HOME"];
    } else {
      process.env["COPILOT_HOME"] = copilotHome;
    }
  });

  it("records the directory the session started in", () => {
    const session = readSession(path.resolve("/elsewhere"), "in-subdirectory");
    equal(session.root, "/repo");
    equal(session.cwd, "/repo/packages/a");
    equal(session.branch, "feature");
    deepEqual(session.shellInputs, ["yarn test"]);
    deepEqual(session.requests, [{ prompt: "Run the tests", reply: "Done" }]);
  });

  it("starts in the repository root if the directory was not recorded", () => {
    const session = readSession(path.resolve("/elsewhere"), "no-cwd");
    equal(session.cwd, "/repo");
  });

  // `inuse.1.lock` marks the session as in use by PID 1, which always runs
  it(
    "skips sessions in use with `previous`",
    { skip: process.platform === "win32" },
    () => {
      throws(
        () => readSession(path.resolve("/in-use"), "previous"),
        /^Error: No Copilot session for .*in-use found/
      );
      equal(readSession(path.resolve("/in-use"), "in-use").root, "/in-use");
    }
  );
});

describe("applyEvents()", () => {
  it("records tool calls with the same ID once", () => {
    const session = newSession("id", "/repo");
    const bash = {
      type: "tool.execution_start",
      data: { toolCallId: "1", toolName: "bash", arguments: { command: "ls" } },
    } as const;
    const view = {
      type: "tool.execution_start",
      data: { toolCallId: "2", toolName: "view", arguments: { path: "a" } },
    } as const;
    applyEvents(session, [bash, bash, view, undefined, view]);
    deepEqual(session.shellInputs, ["ls"]);
    deepEqual(session.toolCalls, [{ name: "view", arguments: { path: "a" } }]);
  });

  it("keeps the root if the session did not record where it started", () => {
    const session = newSession("id", "/repo");
    applyEvents(session, [{ type: "session.start", data: {} }]);
    equal(session.root, "/repo");
    equal(session.cwd, "/repo");
  });
});
