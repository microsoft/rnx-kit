import type { Capability } from "@rnx-kit/config";
import { capabilitiesFor, resolveCapabilities } from "../src/capabilities";
import { filterPreset, mergePresets } from "../src/preset";
import defaultPreset from "../src/presets/microsoft/react-native";
import profile_0_62 from "../src/presets/microsoft/react-native/profile-0.62";
import profile_0_63 from "../src/presets/microsoft/react-native/profile-0.63";
import profile_0_64 from "../src/presets/microsoft/react-native/profile-0.64";
import { pickPackage } from "./helpers";

function makeMockResolver(module: string): RequireResolve {
  return (() => module) as unknown as RequireResolve;
}

describe("capabilitiesFor()", () => {
  test("returns an empty array when there are no dependencies", () => {
    expect(
      capabilitiesFor(
        { name: "@rnx-kit/align-deps", version: "1.0.0" },
        defaultPreset
      )
    ).toEqual([]);
  });

  test("returns capabilities for dependencies declared under `dependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    expect(capabilitiesFor(manifest, defaultPreset)).toEqual([
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  test("returns capabilities for dependencies declared under `peerDependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      peerDependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    expect(capabilitiesFor(manifest, defaultPreset)).toEqual([
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  test("returns capabilities for dependencies declared under `devDependencies`", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      devDependencies: {
        react: "^17.0.1",
        "react-native": "^0.64.1",
      },
    };
    expect(capabilitiesFor(manifest, defaultPreset)).toEqual([
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });

  test("ignores packages that are not managed by align-deps", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      peerDependencies: {
        react: "17.0.1",
        "react-native": "^0.64.1",
      },
      devDependencies: {
        "@rnx-kit/babel-preset-metro-react-native": "*",
        "@rnx-kit/cli": "*",
      },
    };
    expect(capabilitiesFor(manifest, defaultPreset)).toEqual([
      "core",
      "core-android",
      "core-ios",
      "react",
    ]);
  });
});

describe("resolveCapabilities()", () => {
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("dedupes packages", () => {
    const packages = resolveCapabilities(
      "package.json",
      ["core", "core", "test-app"],
      { "0.64": profile_0_64 }
    );

    const { name } = profile_0_64["core"];
    const { name: reactName } = profile_0_64["react"];
    const { name: testAppName } = profile_0_64["test-app"];
    expect(packages).toEqual({
      [name]: [profile_0_64["core"]],
      [reactName]: [profile_0_64["react"]],
      [testAppName]: [profile_0_64["test-app"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("dedupes package versions", () => {
    const packages = resolveCapabilities("package.json", ["webview"], {
      "0.62": profile_0_62,
      "0.63": profile_0_63,
      "0.64": profile_0_64,
    });

    const { name } = profile_0_64["webview"];
    expect(packages).toEqual({
      [name]: [profile_0_62["webview"], profile_0_64["webview"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("ignores missing/unknown capabilities", () => {
    const packages = resolveCapabilities(
      "package.json",
      ["skynet" as Capability, "svg"],
      {
        "0.62": profile_0_62,
        "0.63": profile_0_63,
        "0.64": profile_0_64,
      }
    );

    const { name } = profile_0_64["svg"];
    expect(packages).toEqual({ [name]: [profile_0_64["svg"]] });
    expect(consoleWarnSpy).toBeCalledTimes(1);
  });

  test("resolves custom capabilities", () => {
    const skynet = { name: "skynet", version: "1.0.0" };
    jest.mock(
      "mock-custom-profiles-module",
      () => ({ "0.62": { [skynet.name]: skynet } }),
      { virtual: true }
    );

    const preset = filterPreset(
      mergePresets(
        ["microsoft/react-native", "mock-custom-profiles-module"],
        process.cwd(),
        makeMockResolver("mock-custom-profiles-module")
      ),
      ["react-native@0.62 || 0.63 || 0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["skynet" as Capability, "svg"],
      preset
    );

    const { name } = profile_0_64["svg"];
    expect(packages).toEqual({
      [name]: [profile_0_64["svg"]],
      [skynet.name]: [skynet],
    });
  });

  test("resolves capabilities required by capabilities", () => {
    const packages = resolveCapabilities("package.json", ["core-windows"], {
      "0.63": profile_0_63,
      "0.64": profile_0_64,
    });

    expect(packages).toEqual({
      react: [
        pickPackage(profile_0_63, "react"),
        pickPackage(profile_0_64, "react"),
      ],
      "react-native": [
        pickPackage(profile_0_63, "core"),
        pickPackage(profile_0_64, "core"),
      ],
      "react-native-windows": [
        pickPackage(profile_0_63, "core-windows"),
        pickPackage(profile_0_64, "core-windows"),
      ],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("resolves meta packages", () => {
    jest.mock(
      "mock-meta-package",
      () => ({
        "0.64": {
          "core/all": {
            name: "#meta",
            capabilities: [
              "core-android",
              "core-ios",
              "core-macos",
              "core-windows",
            ],
          },
        },
      }),
      { virtual: true }
    );

    const preset = filterPreset(
      mergePresets(
        ["microsoft/react-native", "mock-meta-package"],
        process.cwd(),
        makeMockResolver("mock-meta-package")
      ),
      ["react-native@0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["core/all" as Capability],
      preset
    );

    expect(packages).toEqual({
      react: [pickPackage(profile_0_64, "react")],
      "react-native": [pickPackage(profile_0_64, "core")],
      "react-native-macos": [pickPackage(profile_0_64, "core-macos")],
      "react-native-windows": [pickPackage(profile_0_64, "core-windows")],
    });
  });

  test("resolves meta packages with loops", () => {
    jest.mock(
      "mock-meta-package-loop",
      () => ({
        "0.64": {
          connor: {
            name: "#meta",
            capabilities: ["core", "reese"],
          },
          reese: {
            name: "#meta",
            capabilities: ["t-800"],
          },
          "t-800": {
            name: "#meta",
            capabilities: ["connor"],
          },
        },
      }),
      { virtual: true }
    );

    const preset = filterPreset(
      mergePresets(
        ["microsoft/react-native", "mock-meta-package-loop"],
        process.cwd(),
        makeMockResolver("mock-meta-package-loop")
      ),
      ["react-native@0.64"]
    );

    const packages = resolveCapabilities(
      "package.json",
      ["reese" as Capability],
      preset
    );

    expect(packages).toEqual({
      react: [pickPackage(profile_0_64, "react")],
      "react-native": [pickPackage(profile_0_64, "core")],
    });
  });
});
