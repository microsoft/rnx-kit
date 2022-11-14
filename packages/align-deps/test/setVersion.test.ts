import type { PackageManifest } from "@rnx-kit/tools-node/package";
import prompts from "prompts";
import { makeSetVersionCommand } from "../src/commands/setVersion";
import { defaultConfig } from "../src/config";

jest.mock("fs");

type Result = {
  didWrite: boolean;
  manifest: Record<string, unknown>;
};

describe("makeSetVersionCommand()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  function setupMocks(manifest: PackageManifest): Result {
    fs.__setMockContent(manifest);
    rnxKitConfig.__setMockConfig(manifest["rnx-kit"]);

    const result: Result = { didWrite: false, manifest: {} };
    fs.__setMockFileWriter((_: string, content: string) => {
      const updatedManifest = JSON.parse(content);
      fs.__setMockContent(updatedManifest);
      rnxKitConfig.__setMockConfig(updatedManifest["rnx-kit"]);

      result.didWrite = true;
      result.manifest = updatedManifest;
    });

    return result;
  }

  const options = {
    presets: defaultConfig.presets,
    loose: false,
    migrateConfig: false,
    verbose: false,
    write: false,
  };

  afterEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
    jest.clearAllMocks();
  });

  test("rejects invalid version numbers", async () => {
    expect(makeSetVersionCommand("latest", options)).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "'latest' is not a valid version number"
        ),
      })
    );
  });

  test("rejects unsupported `react-native` versions", async () => {
    expect(makeSetVersionCommand("0.59", options)).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "'0.59' is not a supported react-native version"
        ),
      })
    );
  });

  test("skips unconfigured packages", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("not-configured");
    expect(result.didWrite).toBe(false);
  });

  test("skips partially configured packages", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          presets: ["custom"],
        },
      },
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("invalid-configuration");
    expect(result.didWrite).toBe(false);
  });

  test("updates `react-native` requirements", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      peerDependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      devDependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "library",
        alignDeps: {
          requirements: {
            development: ["react-native@0.63"],
            production: ["react-native@0.63"],
          },
          capabilities: ["core"],
        },
      },
    });

    const command = await makeSetVersionCommand("0.64,0.63", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("success");
    expect(result.manifest).toEqual({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      peerDependencies: {
        react: "16.13.1 || 17.0.1",
        "react-native": "^0.63.2 || ^0.64.2",
      },
      devDependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      "rnx-kit": {
        kitType: "library",
        alignDeps: {
          requirements: {
            development: ["react-native@0.64"],
            production: ["react-native@0.63 || 0.64"],
          },
          capabilities: ["core"],
        },
      },
    });
  });

  test("updates `react-native` requirements (backwards compatibility)", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      peerDependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      devDependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "library",
        reactNativeVersion: "0.63",
        reactNativeDevVersion: "0.63",
        capabilities: ["core"],
      },
    });

    const command = await makeSetVersionCommand("0.64,0.63", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("success");
    expect(result.manifest).toEqual({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      peerDependencies: {
        react: "16.13.1 || 17.0.1",
        "react-native": "^0.63.2 || ^0.64.2",
      },
      devDependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      "rnx-kit": {
        kitType: "library",
        reactNativeVersion: "0.63",
        reactNativeDevVersion: "0.63",
        capabilities: ["core"],
        alignDeps: {
          requirements: {
            development: ["react-native@0.64"],
            production: ["react-native@0.63 || 0.64"],
          },
          capabilities: ["core"],
        },
      },
    });
  });

  test("only modifies the 'react-native' requirement", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: {
            development: ["react@>=16", "react-native@0.63"],
            production: ["react@>=16", "react-native@0.63"],
          },
          capabilities: ["core"],
        },
      },
    });

    const command = await makeSetVersionCommand("0.64,0.63", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("success");
    expect(result.manifest).toEqual({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: {
            development: ["react@>=16", "react-native@0.64"],
            production: ["react@>=16", "react-native@0.64"],
          },
          capabilities: ["core"],
        },
      },
    });
  });

  test("prompts the user if no version is specified", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.63"],
          capabilities: ["core"],
        },
      },
    });

    prompts.inject([["0.63", "0.64"], "0.64"]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("success");
    expect(result.manifest).toEqual({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.64"],
          capabilities: ["core"],
        },
      },
    });
  });

  test("skips the second prompt if only one version is supported", async () => {
    const result = setupMocks({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.63"],
          capabilities: ["core"],
        },
      },
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("success");
    expect(result.manifest).toEqual({
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.64"],
          capabilities: ["core"],
        },
      },
    });
  });

  test('skips "dirty" packages', async () => {
    const mockManifest = {
      name: "@rnx-kit/align-deps",
      version: "1.0.0-test",
      dependencies: {
        react: "16.13.1",
        "react-native": "^0.62.3",
      },
      "rnx-kit": {
        kitType: "app",
        alignDeps: {
          requirements: ["react-native@0.63"],
          capabilities: ["core"],
        },
      },
    };

    rnxKitConfig.__setMockConfig(mockManifest["rnx-kit"]);
    const result = setupMocks(mockManifest);

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    expect(command("package.json")).toBe("unsatisfied");
    expect(result.didWrite).toBe(false);
  });

  test("exits if the user cancels during prompts", async () => {
    prompts.inject([undefined]);
    expect(await makeSetVersionCommand("", options)).toBeUndefined();

    prompts.inject([["0.63", "0.64"], undefined]);
    expect(await makeSetVersionCommand("", options)).toBeUndefined();
  });
});
