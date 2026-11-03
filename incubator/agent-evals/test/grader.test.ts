import { deepEqual, equal, match } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import CopilotGraderProvider, { runtimeEnv } from "../src/provider/grader.ts";

describe("runtimeEnv()", () => {
  const env = {
    PATH: "/bin",
    HOME: "/home/user",
    USERPROFILE: "C:\\Users\\user",
    SystemRoot: "C:\\Windows",
    HTTPS_PROXY: "https://proxy.example.com",
    no_proxy: "localhost",
    NODE_EXTRA_CA_CERTS: "/etc/ca.pem",
    GH_TOKEN: "secret",
    GITHUB_TOKEN: "secret",
    COPILOT_GITHUB_TOKEN: "secret",
    NODE_OPTIONS: "--inspect",
  };

  it("passes on only the variables needed by the runtime", () => {
    deepEqual(runtimeEnv("/tmp/grader", env, "linux"), {
      PATH: "/bin",
      HOME: "/tmp/grader",
      USERPROFILE: "C:\\Users\\user",
      SystemRoot: "C:\\Windows",
      HTTPS_PROXY: "https://proxy.example.com",
      no_proxy: "localhost",
      NODE_EXTRA_CA_CERTS: "/etc/ca.pem",
    });
  });

  it("replaces the user profile on Windows", () => {
    const result = runtimeEnv("C:\\Temp\\grader", env, "win32");
    equal(result["HOME"], "C:\\Temp\\grader");
    equal(result["USERPROFILE"], "C:\\Temp\\grader");
  });
});

describe("getToken()", { skip: process.platform === "win32" }, () => {
  it("runs `gh auth token` once", () => {
    const bin = fileURLToPath(new URL("__fixtures__/gh", import.meta.url));
    const grader = fileURLToPath(
      new URL("../src/provider/grader.ts", import.meta.url)
    );
    const script = [
      `import { getToken } from ${JSON.stringify(grader)};`,
      "console.log(getToken() === getToken() ? getToken() : 'not cached');",
    ].join("\n");
    const env = { ...process.env };
    delete env["COPILOT_GITHUB_TOKEN"];
    delete env["GH_TOKEN"];
    delete env["GITHUB_TOKEN"];
    const { stdout, stderr, status } = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", script],
      {
        encoding: "utf-8",
        env: { ...env, PATH: `${bin}${path.delimiter}${env["PATH"]}` },
      }
    );
    equal(status, 0, stderr);
    match(stdout, /^token-\d+\n$/);
  });
});

describe("CopilotGraderProvider", () => {
  it("does not start grading if already aborted", async () => {
    const grader = new CopilotGraderProvider();
    deepEqual(
      await grader.callApi("prompt", undefined, {
        abortSignal: AbortSignal.abort(),
      }),
      { error: "Grading was aborted" }
    );
  });
});
