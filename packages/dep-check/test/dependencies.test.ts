import { PackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import path from "path";
import { getRequirements, visitDependencies } from "../src/dependencies";

jest.unmock("@rnx-kit/config");

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
}

function useFixture(name: string): [string, PackageManifest] {
  const fixture = fixturePath(name);
  return [fixture, readPackage(fixture)];
}

describe("visitDependencies()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const currentWorkingDir = process.cwd();

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterEach(() => {
    process.chdir(currentWorkingDir);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns if there are no direct dependencies", () => {
    const visited = new Set<string>();

    visitDependencies(
      { name: "@rnx-kit/dep-check", version: "1.0.0" },
      process.cwd(),
      () => 0,
      visited
    );
    expect(visited.size).toBe(0);

    const dependencies = { "react-native": "1000.0.0" };

    visitDependencies(
      {
        name: "@rnx-kit/dep-check",
        version: "1.0.0",
        peerDependencies: dependencies,
        devDependencies: dependencies,
      },
      process.cwd(),
      () => 0,
      visited
    );
    expect(visited.size).toBe(0);

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("traverse transitive dependencies", () => {
    const fixture = fixturePath("awesome-repo");
    process.chdir(fixture);

    const visited: string[] = [];
    visitDependencies(
      require(path.join(fixture, "package.json")),
      process.cwd(),
      (module) => {
        visited.push(module);
      }
    );

    expect(visited.sort()).toEqual([
      "conan",
      "dutch",
      "john",
      "quaid",
      "react",
      "react-native",
      "t-800",
    ]);

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("skips unresolved packages", () => {
    const visited: string[] = [];
    visitDependencies(
      {
        name: "@rnx-kit/dep-check",
        version: "1.0.0",
        dependencies: {
          "this-does-not-exist": "1.0.0",
        },
      },
      process.cwd(),
      (module) => visited.push(module)
    );

    expect(visited.length).toBe(0);
    expect(consoleWarnSpy).toBeCalledTimes(1);
  });
});

describe("getRequirements()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const defaultOptions = { loose: false };

  afterEach(() => {
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  test("gets requirements from all dependencies", () => {
    const [fixture, manifest] = useFixture("awesome-repo");
    const { reactNativeVersion, capabilities } = getRequirements(
      "^0.63 || ^0.64",
      "app",
      manifest,
      fixture,
      undefined,
      defaultOptions
    );

    expect(reactNativeVersion).toBe("^0.63 || ^0.64");

    expect(capabilities.sort()).toEqual([
      "animation",
      "netinfo",
      "storage",
      "webview",
    ]);

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("gets requirements from all dependencies with custom profiles", () => {
    const cyberdyne = { name: "cyberdyne", version: "1.0.0", devOnly: true };
    const skynet = { name: "skynet", version: "1.0.0" };
    jest.mock(
      "awesome-dep-check-profiles",
      () => ({
        "0.63": {
          [cyberdyne.name]: cyberdyne,
          [skynet.name]: skynet,
        },
        "0.64": {
          [cyberdyne.name]: cyberdyne,
          [skynet.name]: skynet,
        },
      }),
      { virtual: true }
    );

    const [fixture, manifest] = useFixture("awesome-repo-extended");
    const { reactNativeVersion, capabilities } = getRequirements(
      "^0.63 || ^0.64",
      "app",
      manifest,
      fixture,
      "awesome-dep-check-profiles",
      defaultOptions
    );

    expect(reactNativeVersion).toBe("^0.63 || ^0.64");

    expect(capabilities.sort()).toEqual([
      "animation",
      "netinfo",
      "skynet",
      "storage",
      "webview",
    ]);

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("throws if no profiles can satisfy required React Native version", () => {
    expect(() =>
      getRequirements(
        "0.60.6",
        "app",
        {
          name: "@rnx-kit/dep-check",
          version: "1.0.0",
        },
        "",
        undefined,
        defaultOptions
      )
    ).toThrow();

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("throws if no profiles can satisfy requirement of dependencies", () => {
    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");
    expect(() =>
      getRequirements(
        "^0.64",
        "app",
        manifest,
        fixture,
        undefined,
        defaultOptions
      )
    ).toThrowError("No React Native profile could satisfy all dependencies");

    expect(consoleErrorSpy).toBeCalledWith(
      "error",
      expect.stringContaining(
        "No React Native profile could satisfy all dependencies"
      )
    );
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("does not throw if no profiles can satisfy requirement of dependencies in loose mode", () => {
    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");
    expect(() =>
      getRequirements("^0.64", "app", manifest, fixture, undefined, {
        loose: true,
      })
    ).not.toThrow();

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).toBeCalledWith(
      "warn",
      expect.stringContaining(
        "No React Native profile could satisfy all dependencies"
      )
    );
  });
});
