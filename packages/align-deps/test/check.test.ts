import { checkPackageManifest } from "../src/commands/check";
import profile_0_68 from "../src/presets/microsoft/react-native/profile-0.68";
import profile_0_69 from "../src/presets/microsoft/react-native/profile-0.69";
import profile_0_70 from "../src/presets/microsoft/react-native/profile-0.70";
import { packageVersion } from "./helpers";

jest.mock("fs");

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
