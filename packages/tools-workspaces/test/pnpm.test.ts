import { equal, match } from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import { findSentinel, findSentinelSync } from "../src/common.ts";
import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index.ts";
import {
  defineRequire,
  setFixture,
  undefineRequire,
  unsetFixture,
} from "./helper.ts";

describe("findSentinel", () => {
  afterEach(() => {
    unsetFixture();
  });

  it("returns sentinel for pnpm", async () => {
    setFixture("pnpm");
    match((await findSentinel()) ?? "", /[/\\]pnpm-workspace.yaml$/);
  });

  it("returns sentinel for pnpm (sync)", () => {
    setFixture("pnpm");
    match(findSentinelSync() ?? "", /[/\\]pnpm-workspace.yaml$/);
  });
});

describe("findWorkspacePackages", () => {
  const packages = [
    /__fixtures__[/\\]pnpm[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]pnpm[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]pnpm[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]pnpm[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]pnpm[/\\]packages[/\\]t-800$/,
  ];

  before(defineRequire);

  afterEach(() => {
    unsetFixture();
  });

  after(undefineRequire);

  it("returns packages for pnpm workspaces", async () => {
    setFixture("pnpm");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packages[i]);
    }
  });

  it("returns packages for pnpm workspaces (sync)", () => {
    setFixture("pnpm");

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

  it("returns workspace root for pnpm workspaces", async () => {
    const root = setFixture("pnpm");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for pnpm workspaces (sync)", async () => {
    const root = setFixture("pnpm");
    equal(findWorkspaceRootSync(), root);
  });
});
