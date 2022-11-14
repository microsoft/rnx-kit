import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packages = [
    expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]conan$/),
    expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]dutch$/),
    expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]john$/),
    expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]quaid$/),
    expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]t-800$/),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Rush workspaces", async () => {
    setFixture("rush");
    expect((await findWorkspacePackages()).sort()).toEqual(packages);
  });

  test("returns packages for Rush workspaces (sync)", () => {
    setFixture("rush");
    expect(findWorkspacePackagesSync().sort()).toEqual(packages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Rush workspaces", async () => {
    const root = setFixture("rush");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for Rush workspaces (sync)", () => {
    const root = setFixture("rush");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
