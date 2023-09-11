import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packages = [
    expect.stringMatching(/__fixtures__[/\\]bun[/\\]packages[/\\]conan$/),
    expect.stringMatching(/__fixtures__[/\\]bun[/\\]packages[/\\]dutch$/),
    expect.stringMatching(/__fixtures__[/\\]bun[/\\]packages[/\\]john$/),
    expect.stringMatching(/__fixtures__[/\\]bun[/\\]packages[/\\]quaid$/),
    expect.stringMatching(/__fixtures__[/\\]bun[/\\]packages[/\\]t-800$/),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Bun workspaces", async () => {
    setFixture("bun");
    expect((await findWorkspacePackages()).sort()).toEqual(packages);
  });

  test("returns packages for Bun workspaces (sync)", () => {
    setFixture("bun");
    expect(findWorkspacePackagesSync().sort()).toEqual(packages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Bun workspaces", async () => {
    const root = setFixture("bun");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for Bun workspaces (sync)", () => {
    const root = setFixture("bun");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
