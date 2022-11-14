import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packages = [
    expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]conan$/),
    expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]dutch$/),
    expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]john$/),
    expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]quaid$/),
    expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]t-800$/),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for npm workspaces", async () => {
    setFixture("npm");
    expect((await findWorkspacePackages()).sort()).toEqual(packages);
  });

  test("returns packages for npm workspaces (sync)", () => {
    setFixture("npm");
    expect(findWorkspacePackagesSync().sort()).toEqual(packages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for npm workspaces", async () => {
    const root = setFixture("npm");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for npm workspaces (sync)", () => {
    const root = setFixture("npm");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
