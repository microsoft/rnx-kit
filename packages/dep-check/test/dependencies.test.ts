import fs from "fs";
import path from "path";
import {
  getRequirements,
  intersection,
  targetReactNativeVersions,
  visitDependencies,
} from "../src/dependencies";

jest.unmock("@rnx-kit/config");

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
}

describe("intersection()", () => {
  test("matches single versions", () => {
    const targetVersions = targetReactNativeVersions();
    expect(intersection(targetVersions, "0.61.0")).toEqual(["0.61.9999"]);
    expect(intersection(targetVersions, "0.61.5")).toEqual(["0.61.9999"]);
    expect(intersection(targetVersions, "0.62.0")).toEqual(["0.62.9999"]);
    expect(intersection(targetVersions, "0.62.2")).toEqual(["0.62.9999"]);
    expect(intersection(targetVersions, "0.63.0")).toEqual(["0.63.9999"]);
    expect(intersection(targetVersions, "0.63.4")).toEqual(["0.63.9999"]);
    expect(intersection(targetVersions, "0.64.0")).toEqual(["0.64.9999"]);
  });

  test("matches version ranges", () => {
    const targetVersions = targetReactNativeVersions();
    expect(intersection(targetVersions, "^0.61.0")).toEqual(["0.61.9999"]);
    expect(intersection(targetVersions, "^0.61.5")).toEqual(["0.61.9999"]);
    expect(intersection(targetVersions, "^0.62.0")).toEqual(["0.62.9999"]);
    expect(intersection(targetVersions, "^0.62.2")).toEqual(["0.62.9999"]);
    expect(intersection(targetVersions, "^0.63.0")).toEqual(["0.63.9999"]);
    expect(intersection(targetVersions, "^0.63.4")).toEqual(["0.63.9999"]);
    expect(intersection(targetVersions, "^0.64.0")).toEqual(["0.64.9999"]);
  });

  test("matches wider version ranges", () => {
    const targetVersions = targetReactNativeVersions();

    const v61_v62 = "^0.61.0 || ^0.62.0";
    expect(intersection(targetVersions, v61_v62)).toEqual([
      "0.61.9999",
      "0.62.9999",
    ]);

    const v61_v62_v63 = "^0.61.0 || ^0.62.0 || ^0.63.0";
    expect(intersection(targetVersions, v61_v62_v63)).toEqual([
      "0.61.9999",
      "0.62.9999",
      "0.63.9999",
    ]);

    const v62_v64 = "^0.62.0 || ^0.64.0";
    expect(intersection(targetVersions, v62_v64)).toEqual([
      "0.62.9999",
      "0.64.9999",
    ]);

    expect(intersection(targetVersions, ">=0.61")).toEqual(targetVersions);
  });

  test("warns when the version or range cannot be satisfied", () => {
    const targetVersions = targetReactNativeVersions();
    expect(intersection(targetVersions, "0.60.6")).toBe(null);
    expect(intersection(targetVersions, "^0.60.6")).toBe(null);
  });
});

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
      "react-native",
      "react",
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
      manifest,
      fixture
    );

    expect(reactNativeVersion).toBe("0.64.0");

    expect(capabilities.sort()).toEqual([
      "animation",
      "core-android",
      "core-ios",
      "netinfo",
      "storage",
      "webview",
    ]);
  });
});
