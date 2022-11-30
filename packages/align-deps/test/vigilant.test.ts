import {
  buildManifestProfile,
  checkPackageManifestUnconfigured,
  inspect,
} from "../src/commands/vigilant";
import { defaultConfig } from "../src/config";
import type { AlignDepsConfig } from "../src/types";

jest.mock("fs");

function makeConfig(
  requirements: AlignDepsConfig["alignDeps"]["requirements"],
  manifest: AlignDepsConfig["manifest"] = {
    name: "@rnx-kit/align-deps",
    version: "1.0.0-test",
  }
): AlignDepsConfig {
  return {
    kitType: "library" as const,
    alignDeps: {
      presets: ["microsoft/react-native"],
      requirements,
      capabilities: [],
    },
    manifest,
  };
}

describe("buildManifestProfile()", () => {
  test("builds a package manifest for a single profile version", () => {
    const profile = buildManifestProfile(
      "package.json",
      makeConfig(["react-native@0.70"])
    );
    expect(profile).toMatchSnapshot();
  });

  test("builds a package manifest for multiple profile versions", () => {
    const profile = buildManifestProfile(
      "package.json",
      makeConfig({
        development: ["react-native@0.70"],
        production: ["react-native@0.69 || 0.70"],
      })
    );
    expect(profile).toMatchSnapshot();
  });

  test("includes devOnly packages under `dependencies`", () => {
    const { dependencies, devDependencies, peerDependencies } =
      buildManifestProfile("package.json", makeConfig(["react-native@0.70"]));

    expect("react-native-test-app" in dependencies).toBe(true);
    expect("react-native-test-app" in peerDependencies).toBe(false);
    expect("react-native-test-app" in devDependencies).toBe(true);
  });
});

describe("inspect()", () => {
  const mockManifestProfile = {
    name: "@rnx-kit/align-deps",
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
      name: "@rnx-kit/align-deps",
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
      name: "@rnx-kit/align-deps",
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
      name: "@rnx-kit/align-deps",
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
      name: "@rnx-kit/align-deps",
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

  test("does not rewrite peerDependencies if superset", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: {
        react: "^16.8.1",
      },
      peerDependencies: {
        metro: "*",
        react: ">=16.8.0 <18.0.0",
        "react-native": ">=0.64",
      },
      devDependencies: {},
    };
    const profile = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: {
        react: "~17.0.1",
      },
      peerDependencies: {
        metro: "^0.66.2",
        react: "~17.0.1",
        "react-native": "^0.66.0-0",
      },
      devDependencies: {},
    };
    const expectedChanges = [
      {
        name: "react",
        from: manifest.dependencies["react"],
        to: profile.dependencies["react"],
        section: "dependencies",
      },
    ];

    expect(inspect(manifest, profile, false)).toEqual(expectedChanges);
  });
});

describe("checkPackageManifestUnconfigured()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const consoleErrorSpy = jest.spyOn(global.console, "error");

  const defaultOptions = {
    presets: defaultConfig.presets,
    loose: false,
    migrateConfig: false,
    verbose: false,
    write: false,
  };

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

  test("returns exit code 0 when there are no violations", () => {
    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      defaultOptions,
      makeConfig(["react-native@0.70"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "^0.70.0",
        },
      })
    );
    expect(result).toBe("success");
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("returns non-zero exit code when there are violations", () => {
    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      defaultOptions,
      makeConfig(["react-native@0.70"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "1000.0.0",
        },
      })
    );
    expect(result).not.toBe("success");
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).toBeCalledTimes(1);
  });

  test("returns exit code 0 when writing", () => {
    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, write: true },
      makeConfig(["react-native@0.70"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "1000.0.0",
        },
      })
    );
    expect(result).toBe("success");
    expect(didWrite).toBe(true);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("excludes specified packages", () => {
    let didWrite = false;
    fs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, excludePackages: ["@rnx-kit/align-deps"] },
      makeConfig(["react-native@0.70"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "1000.0.0",
        },
      })
    );
    expect(result).toBe("success");
    expect(didWrite).toBe(false);
    expect(consoleErrorSpy).not.toBeCalled();
  });

  test("uses package-specific custom profiles", () => {
    const fixture = `${__dirname}/__fixtures__/config-custom-profiles-only`;
    const kitConfig = {
      kitType: "library" as const,
      alignDeps: {
        presets: [
          "microsoft/react-native",
          `${fixture}/packageSpecificProfiles.js`,
        ],
        requirements: {
          development: ["react-native@0.64"],
          production: ["react-native@0.64 || 0.65"],
        },
        capabilities: [],
      },
    };
    const inputManifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      peerDependencies: {
        react: "17.0.1",
        "react-native": "0.64.0",
      },
      devDependencies: {
        react: "17.0.1",
        "react-native": "0.64.0",
      },
      "rnx-kit": kitConfig,
    };

    rnxKitConfig.__setMockConfig(kitConfig);

    let manifest = undefined;
    fs.__setMockFileWriter((_, content) => {
      manifest = JSON.parse(content);
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, write: true },
      { ...kitConfig, manifest: inputManifest }
    );

    expect(result).toBe("success");
    expect(consoleErrorSpy).not.toBeCalled();
    expect(manifest).toEqual({
      ...inputManifest,
      devDependencies: {
        react: "17.0.2",
        "react-native": "0.64.3",
      },
      peerDependencies: {
        react: "17.0.2",
        "react-native": "0.64.3 || 0.65.2",
      },
    });
  });
});
