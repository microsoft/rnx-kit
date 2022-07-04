import { findWorkspacePackages, findWorkspaceRoot } from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns packages", async () => {
    setFixture("pnpm");
    expect(await findWorkspacePackages()).toEqual([
      expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]conan$/),
      expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]dutch$/),
      expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]john$/),
      expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]quaid$/),
      expect.stringMatching(/__fixtures__[/\\]pnpm[/\\]packages[/\\]t-800$/),
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for pnpm workspaces", async () => {
    setFixture("pnpm");
    expect(await findWorkspaceRoot()).toMatch(/__fixtures__[/\\]pnpm$/);
  });
});
