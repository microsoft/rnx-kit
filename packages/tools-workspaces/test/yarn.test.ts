import { findWorkspacePackages, findWorkspaceRoot } from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Yarn workspaces", async () => {
    setFixture("yarn");
    expect(await findWorkspacePackages()).toEqual([
      expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]conan$/),
      expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]dutch$/),
      expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]john$/),
      expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]quaid$/),
      expect.stringMatching(/__fixtures__[/\\]yarn[/\\]packages[/\\]t-800$/),
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Yarn workspaces", async () => {
    setFixture("yarn");
    expect(await findWorkspaceRoot()).toMatch(/__fixtures__[/\\]yarn$/);
  });
});
