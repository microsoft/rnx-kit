import { deepEqual, equal } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  lazyWorkspacePackages,
  owningPackageDir,
  workspacePackages,
} from "../src/workspace.ts";
import { WORKSPACE } from "./helpers.ts";

describe("workspacePackages()", () => {
  it("returns named packages matching `workspaces`", () => {
    deepEqual(
      workspacePackages(WORKSPACE),
      new Map([
        ["jest-config", "packages/jest-config"],
        ["jest-field", "packages/jest-field"],
        ["node-pkg", "packages/node-pkg"],
      ])
    );
  });

  it("supports `workspaces.packages`", () => {
    const workdir = path.join(WORKSPACE, "..", "workspace-object");
    deepEqual(workspacePackages(workdir), new Map([["a", "packages/a"]]));
  });

  it("returns an empty map without a root manifest", () => {
    deepEqual(workspacePackages(path.join(WORKSPACE, "packages")), new Map());
  });
});

describe("lazyWorkspacePackages()", () => {
  it("only looks up packages once", () => {
    const packages = lazyWorkspacePackages(WORKSPACE);
    equal(packages(), packages());
    equal(packages().get("node-pkg"), "packages/node-pkg");
  });
});

describe("owningPackageDir()", () => {
  const dirs = ["packages/a", "packages/a/b", "packages/c"];

  it("returns the innermost package containing the file", () => {
    equal(owningPackageDir(dirs, "packages/a/src/index.ts"), "packages/a");
    equal(owningPackageDir(dirs, "packages/a/b/src/index.ts"), "packages/a/b");
  });

  it("does not match directories sharing a prefix", () => {
    equal(owningPackageDir(dirs, "packages/c-2/index.ts"), ".");
  });

  it("returns `.` for files outside packages", () => {
    equal(owningPackageDir(dirs, "README.md"), ".");
    equal(owningPackageDir(dirs, "packages/a"), ".");
  });
});
