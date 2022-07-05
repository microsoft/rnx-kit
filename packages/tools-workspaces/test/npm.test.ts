import { findWorkspacePackages, findWorkspaceRoot } from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for npm workspaces", async () => {
    setFixture("npm");
    expect(await findWorkspacePackages()).toEqual([
      expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]conan$/),
      expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]dutch$/),
      expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]john$/),
      expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]quaid$/),
      expect.stringMatching(/__fixtures__[/\\]npm[/\\]packages[/\\]t-800$/),
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for npm workspaces", async () => {
    setFixture("npm");
    expect(await findWorkspaceRoot()).toMatch(/__fixtures__[/\\]npm$/);
  });
});
