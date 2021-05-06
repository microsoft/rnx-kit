import fs from "fs";
import path from "path";
import { getRequirements, visitDependencies } from "../src/dependencies";

jest.unmock("@rnx-kit/config");

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
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
  test("gets requirements from all dependencies", () => {
    const fixture = fixturePath("awesome-repo");
    const manifestJson = fs.readFileSync(path.join(fixture, "package.json"), {
      encoding: "utf-8",
    });
    const manifest = JSON.parse(manifestJson);
    const { reactNativeVersion, capabilities } = getRequirements(
      "^0.63 || ^0.64",
      manifest,
      fixture
    );

    expect(reactNativeVersion).toBe("^0.63 || ^0.64");

    expect(capabilities.sort()).toEqual([
      "animation",
      "core-android",
      "core-ios",
      "netinfo",
      "storage",
      "webview",
    ]);
  });

  test("throws if no profiles can satisfy required React Native version", () => {
    expect(() =>
      getRequirements(
        "0.60.6",
        {
          name: "@rnx-kit/dep-check",
          version: "1.0.0",
        },
        ""
      )
    ).toThrow();
  });
});
