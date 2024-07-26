import { equal, match } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { findSentinel, findSentinelSync } from "../src/common";
import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findSentinel", () => {
  afterEach(() => {
    unsetFixture();
  });

  it("returns sentinel for Yarn", async () => {
    setFixture("yarn");
    match((await findSentinel()) ?? "", /[/\\]yarn.lock$/);
  });

  it("returns sentinel for Yarn (sync)", () => {
    setFixture("yarn");
    match(findSentinelSync() ?? "", /[/\\]yarn.lock$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]yarn[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]yarn[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]yarn[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]yarn[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]yarn[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for Yarn workspaces", async () => {
    setFixture("yarn");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for Yarn workspaces (sync)", () => {
    setFixture("yarn");

    const result = findWorkspacePackagesSync().sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  it("returns workspace root for Yarn workspaces", async () => {
    const root = setFixture("yarn");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for Yarn workspaces (sync)", () => {
    const root = setFixture("yarn");
    equal(findWorkspaceRootSync(), root);
  });
});
