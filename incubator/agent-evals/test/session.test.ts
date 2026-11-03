import { deepEqual, equal } from "node:assert/strict";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { readSession } from "../src/provider/session.ts";

describe("readSession()", () => {
  const copilotHome = process.env["COPILOT_HOME"];

  before(() => {
    process.env["COPILOT_HOME"] = fileURLToPath(
      new URL("__fixtures__/copilot", import.meta.url)
    );
  });

  after(() => {
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
});
