import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packagesPackages = [
    expect.stringMatching(
      /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]conan$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]dutch$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]john$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]quaid$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-packages[/\\]packages[/\\]t-800$/
    ),
  ];

  const workspacesPackages = [
    expect.stringMatching(
      /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]conan$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]dutch$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]john$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]quaid$/
    ),
    expect.stringMatching(
      /__fixtures__[/\\]lerna-workspaces[/\\]packages[/\\]t-800$/
    ),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Lerna workspaces", async () => {
    setFixture("lerna-packages");
    expect((await findWorkspacePackages()).sort()).toEqual(packagesPackages);
  });

  test("returns packages for Lerna workspaces (sync)", () => {
    setFixture("lerna-packages");
    expect(findWorkspacePackagesSync().sort()).toEqual(packagesPackages);
  });

  test("returns packages for delegated workspaces", async () => {
    setFixture("lerna-workspaces");
    expect((await findWorkspacePackages()).sort()).toEqual(workspacesPackages);
  });

  test("returns packages for delegated workspaces (sync)", () => {
    setFixture("lerna-workspaces");
    expect(findWorkspacePackagesSync().sort()).toEqual(workspacesPackages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Lerna workspaces", async () => {
    const root = setFixture("lerna-packages");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for Lerna workspaces (sync)", () => {
    const root = setFixture("lerna-packages");
    expect(findWorkspaceRootSync()).toBe(root);
  });

  test("returns workspace root for delegated workspaces", async () => {
    const root = setFixture("lerna-workspaces");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for delegated workspaces (sync)", () => {
    const root = setFixture("lerna-workspaces");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
