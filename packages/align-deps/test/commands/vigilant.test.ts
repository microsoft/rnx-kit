import {
  deepEqual,
  equal,
  notDeepEqual,
  notEqual,
  ok,
  throws,
} from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import {
  buildManifestProfile,
  checkPackageManifestUnconfigured as checkPackageManifestUnconfiguredActual,
  inspect,
} from "../../src/commands/vigilant.ts";
import { defaultConfig } from "../../src/config.ts";
import type { AlignDepsConfig, Options } from "../../src/types.ts";
import * as mockfs from "../__mocks__/fs.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

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
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("builds a package manifest for a single profile version", (t) => {
    const profile = buildManifestProfile(
      "package.json",
      makeConfig(["react-native@0.70"])
    );

    t.assert.snapshot?.(profile);
  });

  it("builds a package manifest for multiple profile versions", (t) => {
    const profile = buildManifestProfile(
      "package.json",
      makeConfig({
        development: ["react-native@0.70"],
        production: ["react-native@0.69 || 0.70"],
      })
    );

    t.assert.snapshot?.(profile);
  });

  it("includes devOnly packages under `dependencies`", () => {
    const { dependencies, devDependencies, peerDependencies } =
      buildManifestProfile("package.json", makeConfig(["react-native@0.70"]));

    ok("react-native-test-app" in dependencies);
    ok(!("react-native-test-app" in peerDependencies));
    ok("react-native-test-app" in devDependencies);
  });

  it("throws if requirements cannot be satisfied", () => {
    throws(
      () =>
        buildManifestProfile(
          "package.json",
          makeConfig(["react-native@1000.0"])
        ),
      /No profiles could satisfy requirements: react-native@1000\.0/
    );
  });

  it("throws if dev requirements cannot be satisfied", () => {
    throws(
      () =>
        buildManifestProfile(
          "package.json",
          makeConfig({
            development: ["react-native@1000.0"],
            production: ["react-native@0.69 || 0.70"],
          })
        ),
      /No profiles could satisfy requirements: react-native@1000\.0/
    );
  });

  it("throws if prod requirements cannot be satisfied", () => {
    throws(
      () =>
        buildManifestProfile(
          "package.json",
          makeConfig({
            development: ["react-native@0.70"],
            production: ["react-native@1000.0"],
          })
        ),
      /No profiles could satisfy requirements: react-native@1000\.0/
    );
  });
});

describe("inspect()", () => {
  const mockManifestProfile = {
    name: "@rnx-kit/align-deps",
    version: "1.0.0",
    dependencies: {
      "react-native": "^0.73.6",
    },
    peerDependencies: {
      "react-native": "^0.72 || ^0.73",
    },
    devDependencies: {
      "react-native": "^0.73.6",
    },
    unmanagedCapabilities: {
      "react-native": "core",
    },
  };

  it("handles empty dependencies", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
    };
    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: false,
      }),
      {
        errors: {
          dependencies: [],
          peerDependencies: [],
          devDependencies: [],
          capabilities: [],
        },
        errorCount: 0,
        warnings: [],
      }
    );
    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: true,
      }),
      {
        errors: {
          dependencies: [],
          peerDependencies: [],
          devDependencies: [],
          capabilities: [],
        },
        errorCount: 0,
        warnings: [],
      }
    );
  });

  it("ignores unmanaged dependencies", () => {
    const dependencies = {
      "@babel/core": "^7.0.0",
      "react-native": "0.73.6",
    };
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies,
    };

    const expected = {
      errors: {
        dependencies: [
          {
            type: "changed",
            dependency: "react-native",
            target: mockManifestProfile.dependencies["react-native"],
            current: manifest.dependencies["react-native"],
          },
        ],
        peerDependencies: [],
        devDependencies: [],
        capabilities: [],
      },
      errorCount: 1,
      warnings: [],
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: false,
      }),
      expected
    );
    deepEqual(manifest.dependencies, dependencies);
  });

  it("inspects all dependency types", () => {
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: {
        "@babel/core": "^7.0.0",
      },
      peerDependencies: {
        "react-native": "0.73.6",
      },
      devDependencies: {
        "react-native": "0.73.6",
      },
    };

    const expected = {
      errors: {
        dependencies: [],
        peerDependencies: [
          {
            type: "changed",
            dependency: "react-native",
            target: mockManifestProfile.peerDependencies["react-native"],
            current: manifest.peerDependencies["react-native"],
          },
        ],
        devDependencies: [
          {
            type: "changed",
            dependency: "react-native",
            target: mockManifestProfile.devDependencies["react-native"],
            current: manifest.devDependencies["react-native"],
          },
        ],
        capabilities: [],
      },
      errorCount: 2,
      warnings: [],
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: false,
      }),
      expected
    );
  });

  it("modifies the manifest when `write: true`", () => {
    const dependencies = {
      "@babel/core": "^7.0.0",
      "react-native": "0.73.6",
    };
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies: { ...dependencies },
    };

    const expected = {
      errors: {
        dependencies: [
          {
            type: "changed",
            dependency: "react-native",
            target: mockManifestProfile.dependencies["react-native"],
            current: manifest.dependencies["react-native"],
          },
        ],
        peerDependencies: [],
        devDependencies: [],
        capabilities: [],
      },
      errorCount: 1,
      warnings: [],
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: true,
      }),
      expected
    );
    notDeepEqual(manifest.dependencies, dependencies);
  });

  it("does not rewrite peerDependencies if superset", () => {
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
      unmanagedCapabilities: {
        react: "react",
      },
    };
    const expected = {
      errors: {
        dependencies: [
          {
            type: "changed",
            dependency: "react",
            target: profile.dependencies["react"],
            current: manifest.dependencies["react"],
          },
        ],
        peerDependencies: [],
        devDependencies: [],
        capabilities: [],
      },
      errorCount: 1,
      warnings: [],
    };

    deepEqual(
      inspect(manifest, profile, { noUnmanaged: false, write: false }),
      expected
    );
  });

  it("warns about unmanaged dependencies", () => {
    const dependencies = {
      "react-native": "^0.73.6",
    };
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies,
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          capabilities: [],
        },
      },
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: false,
        write: false,
      }),
      {
        errors: {
          dependencies: [],
          peerDependencies: [],
          devDependencies: [],
          capabilities: [],
        },
        errorCount: 0,
        warnings: [
          {
            type: "unmanaged",
            dependency: "react-native",
            capability: "core",
          },
        ],
      }
    );
  });

  it("treats unmanaged dependencies as errors", () => {
    const dependencies = {
      "react-native": "^0.73.6",
    };
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies,
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          capabilities: [],
        },
      },
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: true,
        write: false,
      }),
      {
        errors: {
          dependencies: [],
          peerDependencies: [],
          devDependencies: [],
          capabilities: [
            {
              type: "unmanaged",
              dependency: "react-native",
              capability: "core",
            },
          ],
        },
        errorCount: 1,
        warnings: [],
      }
    );
  });

  it("writes capabilities if `--no-unamaged` is specified", () => {
    const dependencies = {
      "react-native": "^0.73.6",
    };
    const manifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0",
      dependencies,
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          capabilities: [],
        },
      },
    };

    deepEqual(
      inspect(manifest, mockManifestProfile, {
        noUnmanaged: true,
        write: true,
      }),
      {
        errors: {
          dependencies: [],
          peerDependencies: [],
          devDependencies: [],
          capabilities: [
            {
              type: "unmanaged",
              dependency: "react-native",
              capability: "core",
            },
          ],
        },
        errorCount: 1,
        warnings: [],
      }
    );
    deepEqual(manifest["rnx-kit"].alignDeps.capabilities, ["core"]);
  });
});

describe("checkPackageManifestUnconfigured()", () => {
  const defaultOptions = {
    presets: defaultConfig.presets,
    loose: false,
    migrateConfig: false,
    noUnmanaged: false,
    verbose: false,
    write: false,
  };

  function checkPackageManifestUnconfigured(
    manifestPath: string,
    options: Options = defaultOptions,
    inputConfig: AlignDepsConfig
  ) {
    return checkPackageManifestUnconfiguredActual(
      manifestPath,
      options,
      inputConfig,
      undefined,
      mockfs as unknown as typeof import("node:fs")
    );
  }

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  beforeEach(() => {
    mockfs.__setMockContent({});
    mockfs.__setMockFileWriter(() => {
      throw new Error("mock for fs.writeFileSync is not set");
    });
  });

  after(() => {
    undefineRequire();
  });

  it("returns exit code 0 when there are no violations", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
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
    equal(result, "success");
    ok(!didWrite);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns non-zero exit code when there are violations", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
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
    notEqual(result, "success");
    ok(!didWrite);
    equal(errorSpy.mock.callCount(), 1);
  });

  it("returns exit code 0 when writing", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
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
    equal(result, "success");
    ok(didWrite);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("excludes specified packages", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
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
    equal(result, "success");
    ok(!didWrite);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("returns non-zero exit code when there are unmanaged capabilities", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, noUnmanaged: true },
      makeConfig(["react-native@0.73"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "^0.73.0",
          "react-native-test-app": "^2.5.34",
        },
        "rnx-kit": {
          alignDeps: {
            capabilities: ["core"],
          },
        },
      })
    );
    equal(result, "unsatisfied");
    ok(!didWrite);
    equal(errorSpy.mock.callCount(), 1);
  });

  it("returns non-zero exit code when writing with unmanaged capabilities", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    let didWrite = false;
    mockfs.__setMockFileWriter(() => {
      didWrite = true;
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, noUnmanaged: true, write: true },
      makeConfig(["react-native@0.73"], {
        name: "@rnx-kit/align-deps",
        version: "1.0.0",
        dependencies: {
          "react-native": "^0.73.0",
          "react-native-test-app": "^2.5.34",
        },
        "rnx-kit": {
          alignDeps: {
            capabilities: ["core"],
          },
        },
      })
    );
    equal(result, "success");
    ok(didWrite);
    equal(errorSpy.mock.callCount(), 0);
  });

  it("uses package-specific custom profiles", (t) => {
    const errorSpy = t.mock.method(console, "error", () => undefined);

    const kitConfig = {
      kitType: "library" as const,
      alignDeps: {
        presets: [
          "microsoft/react-native",
          fileURLToPath(
            new URL(
              `../__fixtures__/config-custom-profiles-only/packageSpecificProfiles.js`,
              import.meta.url
            )
          ),
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

    let manifest = undefined;
    mockfs.__setMockFileWriter((_, content) => {
      manifest = JSON.parse(content);
    });

    const result = checkPackageManifestUnconfigured(
      "package.json",
      { ...defaultOptions, write: true },
      { ...kitConfig, manifest: inputManifest }
    );

    equal(result, "success");
    equal(errorSpy.mock.callCount(), 0);
    deepEqual(manifest, {
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
