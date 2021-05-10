import type { Capability } from "@rnx-kit/config";
import { capabilitiesFor, resolveCapabilities } from "../src/capabilities";
import profile_0_62 from "../src/profiles/profile-0.62";
import profile_0_63 from "../src/profiles/profile-0.63";
import profile_0_64 from "../src/profiles/profile-0.64";

describe("capabilitiesFor()", () => {
  test("returns `undefined` when react-native is not a dependency", () => {
    expect(
      capabilitiesFor({ name: "@rnx-kit/dep-check", version: "1.0.0" })
    ).toBeUndefined();
    expect(
      capabilitiesFor({
        name: "@rnx-kit/dep-check",
        version: "1.0.0",
        dependencies: {
          react: "^17.0.1",
        },
      })
    ).toBeUndefined();
  });

  test("returns both core-android and core-ios for react-native", () => {
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      peerDependencies: {
        "react-native": "^0.64.1",
      },
    };
    expect(capabilitiesFor(manifest)).toEqual({
      reactNativeVersion: "^0.64",
      reactNativeDevVersion: "0.64.0",
      capabilities: ["core-android", "core-ios"],
    });
  });

  test("returns kit config with type instead of dev version", () => {
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      peerDependencies: {
        "react-native": "^0.64.1",
      },
    };
    expect(capabilitiesFor(manifest, "app")).toEqual({
      reactNativeVersion: "^0.64",
      kitType: "app",
      capabilities: ["core-android", "core-ios"],
    });
  });

  test("ignores packages that are not managed by dep-check", () => {
    const manifest = {
      name: "@rnx-kit/dep-check",
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
    expect(capabilitiesFor(manifest, "app")).toEqual({
      reactNativeVersion: "^0.64",
      kitType: "app",
      capabilities: ["core-android", "core-ios", "react"],
    });
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
      ["core-android", "core-ios", "test-app"],
      [profile_0_64]
    );

    const { name } = profile_0_64["core-ios"];
    const { name: testAppName } = profile_0_64["test-app"];
    expect(packages).toEqual({
      [name]: [profile_0_64["core-ios"]],
      [testAppName]: [profile_0_64["test-app"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("dedupes package versions", () => {
    const packages = resolveCapabilities(
      ["test-app"],
      [profile_0_62, profile_0_63, profile_0_64]
    );

    const { name } = profile_0_64["test-app"];
    expect(packages).toEqual({
      [name]: [profile_0_62["test-app"], profile_0_64["test-app"]],
    });

    expect(consoleWarnSpy).not.toBeCalled();
  });

  test("ignores missing/unknown capabilities", () => {
    const packages = resolveCapabilities(
      ["skynet" as Capability, "svg"],
      [profile_0_62, profile_0_63, profile_0_64]
    );

    const { name } = profile_0_64["svg"];
    expect(packages).toEqual({ [name]: [profile_0_64["svg"]] });
    expect(consoleWarnSpy).toBeCalledTimes(1);
  });
});
