import { equal, match } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { findSentinel, findSentinelSync } from "../src/implementations/common";
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

  it("returns sentinel for Rush", async () => {
    setFixture("rush");
    match((await findSentinel()) ?? "", /[/\\]rush.json$/);
  });

  it("returns sentinel for Rush (sync)", () => {
    setFixture("rush");
    match(findSentinelSync() ?? "", /[/\\]rush.json$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]rush[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]rush[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]rush[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]rush[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]rush[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for Rush workspaces", async () => {
    setFixture("rush");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for Rush workspaces (sync)", () => {
    setFixture("rush");

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

  it("returns workspace root for Rush workspaces", async () => {
    const root = setFixture("rush");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for Rush workspaces (sync)", () => {
    const root = setFixture("rush");
    equal(findWorkspaceRootSync(), root);
  });
});
