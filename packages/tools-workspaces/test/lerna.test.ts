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

  it("returns sentinel for Lerna", async () => {
    setFixture("lerna-packages");
    match((await findSentinel()) ?? "", /[/\\]lerna.json$/);

    setFixture("lerna-workspaces");
    match((await findSentinel()) ?? "", /[/\\]lerna.json$/);
  });

  it("returns sentinel for Lerna (sync)", () => {
    setFixture("lerna-packages");
    match(findSentinelSync() ?? "", /[/\\]lerna.json$/);

    setFixture("lerna-workspaces");
    match(findSentinelSync() ?? "", /[/\\]lerna.json$/);
  });
});

describe("findWorkspacePackages", () => {
  const packagesPackages = [
    /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]t-800$/,
  ];

  const workspacesPackages = [
    /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]conan$/,
    /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]dutch$/,
    /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]john$/,
    /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]quaid$/,
    /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]t-800$/,
  ];

  afterEach(() => {
    unsetFixture();
  });

  it("returns packages for Lerna workspaces", async () => {
    setFixture("lerna-packages");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packagesPackages[i]);
    }
  });

  it("returns packages for Lerna workspaces (sync)", () => {
    setFixture("lerna-packages");

    const result = findWorkspacePackagesSync().sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], packagesPackages[i]);
    }
  });

  it("returns packages for delegated workspaces", async () => {
    setFixture("lerna-workspaces");

    const result = (await findWorkspacePackages()).sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], workspacesPackages[i]);
    }
  });

  it("returns packages for delegated workspaces (sync)", () => {
    setFixture("lerna-workspaces");

    const result = findWorkspacePackagesSync().sort();
    for (let i = 0; i < result.length; ++i) {
      match(result[i], workspacesPackages[i]);
    }
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  it("returns workspace root for Lerna workspaces", async () => {
    const root = setFixture("lerna-packages");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for Lerna workspaces (sync)", () => {
    const root = setFixture("lerna-packages");
    equal(findWorkspaceRootSync(), root);
  });

  it("returns workspace root for delegated workspaces", async () => {
    const root = setFixture("lerna-workspaces");
    equal(await findWorkspaceRoot(), root);
  });

  it("returns workspace root for delegated workspaces (sync)", () => {
    const root = setFixture("lerna-workspaces");
    equal(findWorkspaceRootSync(), root);
  });
});
