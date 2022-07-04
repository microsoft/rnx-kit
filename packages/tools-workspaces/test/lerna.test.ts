import { findWorkspacePackages, findWorkspaceRoot } from "../src/index";
import { setFixture, unsetFixture } from "./helper";

describe("findWorkspacePackages", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns packages for Lerna workspaces", async () => {
    setFixture("lerna-packages");
    expect(await findWorkspacePackages()).toEqual([
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
    ]);
  });

  test("returns packages for delegated workspaces", async () => {
    setFixture("lerna-workspaces");
    expect(await findWorkspacePackages()).toEqual([
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
    ]);
  });
});

describe("findWorkspaceRoot", () => {
  afterEach(() => {
    unsetFixture();
  });

  test("returns workspace root for Lerna workspaces", async () => {
    setFixture("lerna-packages");
    expect(await findWorkspaceRoot()).toMatch(
      /__fixtures__[/\\]lerna-packages$/
    );
  });

  test("returns workspace root for delegated workspaces", async () => {
    setFixture("lerna-workspaces");
    expect(await findWorkspaceRoot()).toMatch(
      /__fixtures__[/\\]lerna-workspaces$/
    );
  });
});
