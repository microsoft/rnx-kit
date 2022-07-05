import { findWorkspacePackages, findWorkspaceRoot } from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Rush workspaces", async () => {
    setFixture("rush");
    expect(await findWorkspacePackages()).toEqual([
      expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]conan$/),
      expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]dutch$/),
      expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]john$/),
      expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]quaid$/),
      expect.stringMatching(/__fixtures__[/\\]rush[/\\]packages[/\\]t-800$/),
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Rush workspaces", async () => {
    setFixture("rush");
    expect(await findWorkspaceRoot()).toMatch(/__fixtures__[/\\]rush$/);
  });
});
