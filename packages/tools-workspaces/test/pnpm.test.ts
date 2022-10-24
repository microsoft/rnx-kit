import {
  findWorkspacePackages,
  findWorkspacePackagesSync,
  findWorkspaceRoot,
  findWorkspaceRootSync,
} from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  const packages = [
    expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]conan$/),
    expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]dutch$/),
    expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]john$/),
    expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]quaid$/),
    expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]t-800$/),
  ];

  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for pnpm workspaces", async () => {
    setFixture("pnpm");
    expect((await findWorkspacePackages()).sort()).toEqual(packages);
  });

  test("returns packages for pnpm workspaces (sync)", () => {
    setFixture("pnpm");
    expect(findWorkspacePackagesSync().sort()).toEqual(packages);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for pnpm workspaces", async () => {
    const root = setFixture("pnpm");
    expect(await findWorkspaceRoot()).toBe(root);
  });

  test("returns workspace root for pnpm workspaces (sync)", async () => {
    const root = setFixture("pnpm");
    expect(findWorkspaceRootSync()).toBe(root);
  });
});
