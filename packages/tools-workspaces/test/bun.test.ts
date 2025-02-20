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

  it("returns sentinel for Bun", async () => {
    setFixture("bun");
    match((await findSentinel()) ?? "", /[/\\]bun.lockb$/);
  });

  it("returns sentinel for Bun (sync)", () => {
    setFixture("bun");
    match(findSentinelSync() ?? "", /[/\\]bun.lockb$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]bun[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]bun[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]bun[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]bun[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]bun[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for Bun workspaces", async () => {
    setFixture("bun");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for Bun workspaces (sync)", () => {
    setFixture("bun");

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

  it("returns workspace root for Bun workspaces", async () => {
    const root = setFixture("bun");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for Bun workspaces (sync)", () => {
    const root = setFixture("bun");
    equal(findWorkspaceRootSync(), root);
  });
});
