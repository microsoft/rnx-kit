import {
  buildManifestProfile,
  buildProfileFromConfig,
  inspect,
  makeVigilantCommand,
} from "../src/vigilant";

jest.mock("fs");

describe("buildManifestProfile()", () => {
  const testVersion = "1.0.0-test";

  test("builds a package manifest for a single profile version", () => {
    const profile = buildManifestProfile("0.64", undefined);
    profile.version = testVersion;
    expect(profile).toMatchSnapshot();
  });

  test("builds a package manifest for multiple profile versions", () => {
    const profile = buildManifestProfile("0.64,0.63", undefined);
    profile.version = testVersion;
    expect(profile).toMatchSnapshot();
  });

  test("includes devOnly packages under `dependencies`", () => {
    const { dependencies, devDependencies, peerDependencies } =
      buildManifestProfile("0.64", undefined);

    expect("react-native-test-app" in dependencies).toBe(true);
    expect("react-native-test-app" in peerDependencies).toBe(false);
    expect("react-native-test-app" in devDependencies).toBe(true);
  });

  test("includes custom profiles", () => {
    const skynet = { name: "skynet", version: "1.0.0" };
    jest.mock(
      "vigilant-custom-profiles",
      () => ({ "0.64": { [skynet.name]: skynet } }),
      { virtual: true }
    );

    const { dependencies, devDependencies, peerDependencies } =
      buildManifestProfile("0.64", "vigilant-custom-profiles");

    expect(skynet.name in dependencies).toBe(true);
    expect(skynet.name in peerDependencies).toBe(true);
    expect(skynet.name in devDependencies).toBe(true);
  });

  test("throws when no profiles match the requested versions", () => {
    expect(() => buildManifestProfile("0.59", undefined)).toThrow();
    expect(() => buildManifestProfile("0.59,0.64", undefined)).toThrow();
  });
});

describe("buildProfileFromConfig()", () => {
  const defaultProfile = buildManifestProfile("0.64", undefined);

  test("returns default profile if there is no config", () => {
    expect(buildProfileFromConfig(0, defaultProfile)).toBe(defaultProfile);
  });

  test("filters out managed capabilities", () => {
    const dependencies = [
      "dependencies",
      "peerDependencies",
      "devDependencies",
    ] as const;
    const config = {
      kitType: "library" as const,
      reactNativeVersion: "0.64",
      reactNativeDevVersion: "0.64",
      capabilities: [],
      manifest: {
        name: "@rnx-kit/dep-check",
        version: "1.0.0",
        dependencies: {
          "react-native": "^0.64.0",
        },
      },
    };
    const profile = buildProfileFromConfig(config, defaultProfile);
    dependencies.forEach((section) => {
      expect(Object.keys(profile[section])).toContain("react");
      expect(Object.keys(profile[section])).toContain("react-native");
    });

    const withCapabilities = buildProfileFromConfig(
      {
        ...config,
        capabilities: ["core-android", "core-ios"],
      },
      defaultProfile
    );

    dependencies.forEach((section) => {
      expect(Object.keys(withCapabilities[section])).not.toContain("react");
      expect(Object.keys(withCapabilities[section])).not.toContain(
        "react-native"
      );
    });
  });
});

describe("inspect()", () => {
  const mockManifestProfile = {
    name: "@rnx-kit/dep-check",
    version: "1.0.0",
    dependencies: {
      "react-native": "^0.63.2",
    },
    peerDependencies: {
      "react-native": "^0.63 || ^0.64",
    },
    devDependencies: {
      "react-native": "^0.63.2",
    },
  };

  test("handles empty dependencies", () => {
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
    };
    expect(inspect(manifest, mockManifestProfile, false)).toEqual([]);
    expect(inspect(manifest, mockManifestProfile, true)).toEqual([]);
  });

  test("ignores unmanaged dependencies", () => {
    const dependencies = {
      "@babel/core": "^7.0.0",
      "react-native": "0.63.2",
    };
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies,
    };

    const expectedChanges = [
      {
        name: "react-native",
        from: manifest.dependencies["react-native"],
        to: mockManifestProfile.dependencies["react-native"],
        section: "dependencies",
      },
    ];

    expect(inspect(manifest, mockManifestProfile, false)).toEqual(
      expectedChanges
    );
    expect(manifest.dependencies).toEqual(dependencies);
  });

  test("inspects all dependency types", () => {
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        "@babel/core": "^7.0.0",
      },
      peerDependencies: {
        "react-native": "0.63.2",
      },
      devDependencies: {
        "react-native": "0.63.2",
      },
    };

    const expectedChanges = [
      {
        name: "react-native",
        from: manifest.peerDependencies["react-native"],
        to: mockManifestProfile.peerDependencies["react-native"],
        section: "peerDependencies",
      },
      {
        name: "react-native",
        from: manifest.devDependencies["react-native"],
        to: mockManifestProfile.devDependencies["react-native"],
        section: "devDependencies",
      },
    ];

    expect(inspect(manifest, mockManifestProfile, false)).toEqual(
      expectedChanges
    );
  });

  test("modifies the manifest when `write: true`", () => {
    const dependencies = {
      "@babel/core": "^7.0.0",
      "react-native": "0.63.2",
    };
    const manifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: { ...dependencies },
    };

    const expectedChanges = [
      {
        name: "react-native",
        from: manifest.dependencies["react-native"],
        to: mockManifestProfile.dependencies["react-native"],
        section: "dependencies",
      },
    ];

    expect(inspect(manifest, mockManifestProfile, true)).toEqual(
      expectedChanges
    );
    expect(manifest.dependencies).not.toEqual(dependencies);
  });
});

describe("makeVigilantCommand()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const consoleErrorSpy = jest.spyOn(global.console, "error");

  beforeEach(() => {
    consoleErrorSpy.mockReset();
    fs.__setMockContent({});
    fs.__setMockFileWriter(() => {
      throw new Error("mock for fs.writeFileSync is not set");
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns no command if no versions are specified", () => {
    expect(
      makeVigilantCommand({ versions: "", loose: false, write: false })
    ).toBeUndefined();
  });

  test("returns exit code 0 when there are no violations", () => {
    fs.__setMockContent({
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        "react-native": "^0.63.2",
      },
    });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = makeVigilantCommand({
      versions: "0.63",
      loose: false,
      write: false,
    })("package.json");
    expect(result).toBe(0);
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("returns non-zero exit code when there are violations", () => {
    fs.__setMockContent({
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        "react-native": "0.63.2",
      },
    });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = makeVigilantCommand({
      versions: "0.63",
      loose: false,
      write: false,
    })("package.json");
    expect(result).not.toBe(0);
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("returns exit code 0 when writing", () => {
    fs.__setMockContent({
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        "react-native": "0.63.2",
      },
    });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = makeVigilantCommand({
      versions: "0.63",
      loose: false,
      write: true,
    })("package.json");
    expect(result).toBe(0);
    expect(didWrite).toBe(true);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("excludes specified packages", () => {
    fs.__setMockContent({
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        "react-native": "0.59.10",
      },
    });

    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = makeVigilantCommand({
      versions: "0.63",
      write: false,
      excludePackages: "@rnx-kit/dep-check",
      loose: false,
    })("package.json");
    expect(result).toBe(0);
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("uses package-specific custom profiles", () => {
    const fixture = `${__dirname}/__fixtures__/config-custom-profiles-only`;
    const kitConfig = {
      customProfiles: `${fixture}/packageSpecificProfiles.js`,
    };

    rnxKitConfig.__setMockConfig(kitConfig);

    fs.__setMockContent({
      name: "@rnx-kit/dep-check",
      version: "1.0.0",
      dependencies: {
        react: "17.0.1",
        "react-native": "0.64.0",
      },
      "rnx-kit": kitConfig,
    });

    const dependencies = {};
    fs.__setMockFileWriter((_, content) => {
      const { dependencies: newDependencies } = JSON.parse(content);
      Object.keys(newDependencies).forEach((pkgName) => {
        dependencies[pkgName] = newDependencies[pkgName];
      });
    });

    const result = makeVigilantCommand({
      versions: "0.64",
      loose: false,
      write: true,
    })("package.json");
    expect(result).toBe(0);
    expect(consoleErrorSpy).not.toBeCalled();
    expect(dependencies["react"]).toBe("17.0.2");
    expect(dependencies["react-native"]).toBe("0.64.3");
  });
});
