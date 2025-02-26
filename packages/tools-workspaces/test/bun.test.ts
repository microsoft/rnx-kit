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

  it("returns sentinel for Bun (text)", async () => {
    setFixture("bun.lock");
    match((await findSentinel()) ?? "", /[/\\]bun.lock$/);
  });

  it("returns sentinel for Bun (text, sync)", () => {
    setFixture("bun.lock");
    match(findSentinelSync() ?? "", /[/\\]bun.lock$/);
  });

  it("returns sentinel for Bun (binary)", async () => {
    setFixture("bun.lockb");
    match((await findSentinel()) ?? "", /[/\\]bun.lockb$/);
  });

  it("returns sentinel for Bun (binary, sync)", () => {
    setFixture("bun.lockb");
    match(findSentinelSync() ?? "", /[/\\]bun.lockb$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]bun.lock[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]bun.lock[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]bun.lock[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]bun.lock[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]bun.lock[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for Bun workspaces", async () => {
    setFixture("bun.lock");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for Bun workspaces (sync)", () => {
    setFixture("bun.lock");

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
    const root = setFixture("bun.lock");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for Bun workspaces (sync)", () => {
    const root = setFixture("bun.lock");
    equal(findWorkspaceRootSync(), root);
  });
});
