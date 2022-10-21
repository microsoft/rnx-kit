import { PackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import path from "path";
import { gatherRequirements, visitDependencies } from "../src/dependencies";
import profile_0_69 from "../src/presets/microsoft/react-native/profile-0.69";
import profile_0_70 from "../src/presets/microsoft/react-native/profile-0.70";

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
      { name: "@rnx-kit/align-deps", version: "1.0.0" },
      process.cwd(),
      () => 0,
      visited
    );
    expect(visited.size).toBe(0);

    const dependencies = { "react-native": "1000.0.0" };

    visitDependencies(
      {
        name: "@rnx-kit/align-deps",
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
        name: "@rnx-kit/align-deps",
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

describe("gatherRequirements()", () => {
  const consoleErrorSpy = jest.spyOn(global.console, "error");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const defaultOptions = { loose: false };

  afterEach(() => {
    consoleErrorSpy.mockReset();
    consoleWarnSpy.mockReset();
  });

  test("gather requirements from all dependencies", () => {
    const [fixture, manifest] = useFixture("awesome-repo");
    const initialPreset = { "0.69": profile_0_69, "0.70": profile_0_70 };
    const initialCapabilities = manifest["rnx-kit"]?.capabilities;
    const { preset, capabilities } = gatherRequirements(
      fixture,
      manifest,
      initialPreset,
      ["react-native@0.69 || 0.70"],
      Array.isArray(initialCapabilities) ? initialCapabilities : [],
      defaultOptions
    );

    expect(preset).toStrictEqual(initialPreset);

    expect(capabilities.sort()).toEqual([
      "animation",
      "core-android",
      "hermes",
      "lazy-index",
      "netinfo",
      "storage",
      "webview",
    ]);

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("gather requirements from all dependencies with custom profiles", () => {
    const cyberdyne = { name: "cyberdyne", version: "1.0.0", devOnly: true };
    const skynet = { name: "skynet", version: "1.0.0" };

    const initialPreset = {
      "0.69": {
        ...profile_0_69,
        [cyberdyne.name]: cyberdyne,
        [skynet.name]: skynet,
      },
      "0.70": {
        ...profile_0_70,
        [cyberdyne.name]: cyberdyne,
        [skynet.name]: skynet,
      },
    };

    const [fixture, manifest] = useFixture("awesome-repo-extended");
    const initialCapabilities = manifest["rnx-kit"]?.capabilities;

    const { preset, capabilities } = gatherRequirements(
      fixture,
      manifest,
      initialPreset,
      ["react-native@0.69 || 0.70"],
      Array.isArray(initialCapabilities) ? initialCapabilities : [],
      defaultOptions
    );

    expect(preset).toStrictEqual(initialPreset);

    expect(capabilities.sort()).toEqual([
      "animation",
      "core-android",
      "hermes",
      "lazy-index",
      "netinfo",
      "skynet",
      "storage",
      "webview",
    ]);

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("throws if no profiles can satisfy requirements of dependencies", () => {
    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");
    expect(() =>
      gatherRequirements(
        fixture,
        manifest,
        { "0.70": profile_0_70 },
        ["react-native@0.70"],
        [],
        defaultOptions
      )
    ).toThrowError("No profiles could satisfy all requirements");

    expect(consoleErrorSpy).toBeCalledWith(
      "error",
      expect.stringContaining("No profiles could satisfy all requirements")
    );
    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("does not throw if no profiles can satisfy requirement of dependencies in loose mode", () => {
    const [fixture, manifest] = useFixture("no-profile-satisfying-deps");
    expect(() =>
      gatherRequirements(
        fixture,
        manifest,
        { "0.70": profile_0_70 },
        ["react-native@0.70"],
        [],
        { loose: true }
      )
    ).not.toThrow();

    expect(consoleErrorSpy).not.toBeCalled();
    expect(consoleWarnSpy).toBeCalledWith(
      "warn",
      expect.stringContaining("No profiles could satisfy all requirements")
    );
  });
});
