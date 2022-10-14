import semverCoerce from "semver/functions/coerce";
import {
  checkPackageManifest,
  containsValidPresets,
  containsValidRequirements,
  getCheckConfig,
} from "../src/check";
import profile_0_68 from "../src/presets/microsoft/react-native/profile-0.68";
import profile_0_69 from "../src/presets/microsoft/react-native/profile-0.69";
import profile_0_70 from "../src/presets/microsoft/react-native/profile-0.70";
import { packageVersion } from "./helpers";

jest.mock("fs");

describe("containsValidPresets()", () => {
  test("is valid when 'presets' is unset", () => {
    expect(containsValidPresets({})).toBe(true);
  });

  test("is invalid when 'presets' is empty", () => {
    expect(containsValidPresets({ presets: [] })).toBe(false);
  });

  test("is invalid when 'presets' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(containsValidPresets({ presets: "[]" })).toBe(false);
  });
});

describe("containsValidRequirements()", () => {
  test("is invalid when 'requirements' is unset", () => {
    expect(containsValidRequirements({})).toBe(false);
  });

  test("is invalid when 'requirements' is empty", () => {
    expect(containsValidRequirements({ requirements: [] })).toBe(false);
    expect(
      // @ts-expect-error intentionally passing an invalid type
      containsValidRequirements({ requirements: { production: [] } })
    ).toBe(false);
    expect(
      containsValidRequirements({
        requirements: { development: [], production: [] },
      })
    ).toBe(false);
  });

  test("is invalid when 'requirements' is not an array", () => {
    // @ts-expect-error intentionally passing an invalid type
    expect(containsValidRequirements({ requirements: "[]" })).toBe(false);
  });

  test("is valid when 'requirements' contains at least one requirement", () => {
    expect(
      containsValidRequirements({ requirements: ["react-native@*"] })
    ).toBe(true);
    expect(
      containsValidRequirements({
        // @ts-expect-error intentionally passing an invalid type
        requirements: { production: ["react-native@*"] },
      })
    ).toBe(true);
  });
});

describe("checkPackageManifest({ kitType: 'library' })", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const defaultOptions = { loose: false, write: false };

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  beforeEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns error code when reading invalid manifests", () => {
    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "invalid-manifest"
    );
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "not-configured"
    );
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@0.70"] },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@^0.69.0 || ^0.70.0"] },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@0.70"] },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(didWriteToPath).toBe(false);
  });

  test("returns error code if changes are needed", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).not.toBe(
      "success"
    );
  });

  test("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    fs.__setMockContent(mockManifest);
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(didWriteToPath).toBe("package.json");
  });

  test("preserves indentation in 'package.json'", () => {
    let output = "";

    fs.__setMockContent(mockManifest, "\t");
    fs.__setMockFileWriter((_, content) => {
      output = content;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(output).toMatchSnapshot();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.68 || 0.69 || 0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("handles development version ranges", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });
});

describe("checkPackageManifest({ kitType: 'library' }) (backwards compatibility)", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const defaultOptions = { loose: false, write: false };

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  beforeEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns error code when reading invalid manifests", () => {
    expect(checkPackageManifest("package.json", defaultOptions)).not.toBe(
      "success"
    );
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "not-configured"
    );
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.70.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "^0.69.0 || ^0.70.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.70.0" });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(didWriteToPath).toBe(false);
  });

  test("returns error code if changes are needed", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "unsatisfied"
    );
  });

  test("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    fs.__setMockContent(mockManifest);
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(didWriteToPath).toBe("package.json");
  });

  test("preserves indentation in 'package.json'", () => {
    let output = "";

    fs.__setMockContent(mockManifest, "\t");
    fs.__setMockFileWriter((_, content) => {
      output = content;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(
      checkPackageManifest("package.json", { loose: false, write: true })
    ).toBe("success");
    expect(output).toMatchSnapshot();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      reactNativeDevVersion: "0.69.4",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });

  test("handles development version ranges", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      reactNativeDevVersion: "^0.69.4",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", defaultOptions)).toBe(
      "success"
    );
  });
});

describe("getCheckConfig", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const defaultOptions = { loose: false, write: false };

  beforeEach(() => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns early if the package is unconfigured", () => {
    expect(getCheckConfig("package.json", defaultOptions)).toBe(0);
  });

  test("returns default values given react-native version", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ reactNativeVersion });

    expect(getCheckConfig("package.json", defaultOptions)).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: semverCoerce(reactNativeVersion)?.version,
    });
  });

  test("uses react-native version provided by vigilant flag if unspecified", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ customProfiles: "" });

    expect(
      getCheckConfig("package.json", {
        ...defaultOptions,
        supportedVersions: reactNativeVersion,
        targetVersion: reactNativeVersion,
      })
    ).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: reactNativeVersion,
    });
  });

  test("does not overwrite existing config with the version provided by vigilant flag", () => {
    const reactNativeVersion = "^0.64";
    rnxKitConfig.__setMockConfig({ reactNativeVersion });

    expect(
      getCheckConfig("package.json", {
        ...defaultOptions,
        supportedVersions: "1000.0",
        targetVersion: "1000.0",
      })
    ).toEqual({
      capabilities: [],
      kitType: "library",
      manifest: mockManifest,
      reactNativeVersion,
      reactNativeDevVersion: semverCoerce(reactNativeVersion)?.version,
    });
  });
});
