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

  it("returns sentinel for npm", async () => {
    setFixture("npm");
    match((await findSentinel()) ?? "", /[/\\]package-lock.json$/);
  });

  it("returns sentinel for npm (sync)", () => {
    setFixture("npm");
    match(findSentinelSync() ?? "", /[/\\]package-lock.json$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]npm[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]npm[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]npm[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]npm[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]npm[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for npm workspaces", async () => {
    setFixture("npm");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for npm workspaces (sync)", () => {
    setFixture("npm");

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

  it("returns workspace root for npm workspaces", async () => {
    const root = setFixture("npm");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for npm workspaces (sync)", () => {
    const root = setFixture("npm");
    equal(findWorkspaceRootSync(), root);
  });
});
