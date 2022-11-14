import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packages = [
    expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]conan$/),
    expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]dutch$/),
    expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]john$/),
    expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]quaid$/),
    expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]t-800$/),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Yarn workspaces", async () => {
    setFixture("yarn");
    expect((await findWorkspacePackages()).sort()).toEqual(packages);
  });

  test("returns packages for Yarn workspaces (sync)", () => {
    setFixture("yarn");
    expect(findWorkspacePackagesSync().sort()).toEqual(packages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Yarn workspaces", async () => {
    const root = setFixture("yarn");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for Yarn workspaces (sync)", () => {
    const root = setFixture("yarn");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
