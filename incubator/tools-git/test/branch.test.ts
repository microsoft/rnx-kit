import { equal, throws } from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { getBaseCommit, getDefaultBranch } from "../src/branch.ts";

// Branch lookups run the real `git`, so they need a real repository
const root = fs.mkdtempSync(path.join(os.tmpdir(), "tools-git-test-"));
const commits: Record<string, string> = {};

function run(...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf-8" }).trim();
}

function commit(name: string): void {
  run(
    "-c",
    "user.name=test",
    "-c",
    "user.email=test@example.com",
    "commit",
    "--quiet",
    "--allow-empty",
    "--no-verify",
    "--no-gpg-sign",
    "-m",
    name
  );
  commits[name] = run("rev-parse", "HEAD");
}

// main:    A - B
//           \
// feature:   C
before(() => {
  run("init", "--quiet", "--initial-branch=main");
  commit("A");
  run("switch", "--quiet", "-c", "feature");
  commit("C");
  run("switch", "--quiet", "main");
  commit("B");
  run("remote", "add", "upstream", root);
  run("update-ref", "refs/remotes/upstream/main", commits["B"]);
  run("update-ref", "refs/remotes/origin/trunk", commits["B"]);
  run("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk");
});

after(() => {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
});

describe("getDefaultBranch()", () => {
  it("returns default branch", () => {
    equal(getDefaultBranch(), "origin/main");
  });

  it("returns fallback branch", () => {
    const options = { cwd: root, remote: "none" };
    equal(getDefaultBranch("origin/trunk", options, "1"), "origin/trunk");
    equal(getDefaultBranch(undefined, options, "1"), "none/main");
  });

  it("returns the branch `<remote>/HEAD` points to", () => {
    equal(getDefaultBranch(undefined, { cwd: root }, ""), "origin/trunk");
    equal(getDefaultBranch(undefined, { cwd: root }, "1"), "origin/trunk");
  });

  it("asks the remote if `<remote>/HEAD` does not exist", () => {
    const options = { cwd: root, remote: "upstream" };
    equal(getDefaultBranch(undefined, options, ""), "upstream/main");
  });

  it("throws if the default branch cannot be determined", () => {
    const options = { cwd: root, remote: "none" };
    throws(
      () => getDefaultBranch(undefined, options, ""),
      new Error("Failed to determine default branch")
    );
  });
});

describe("getBaseCommit()", () => {
  it("returns the commit `head` forked off", () => {
    const { A, B, C } = commits;
    equal(getBaseCommit("main", undefined, { cwd: root }), B);
    equal(getBaseCommit("main", undefined, { cwd: root, head: C }), A);
  });

  it("defaults to the default branch of `remote`", () => {
    const { A, C } = commits;
    const options = { cwd: root, remote: "upstream", head: C };
    equal(getBaseCommit(undefined, undefined, options), A);
  });
});
