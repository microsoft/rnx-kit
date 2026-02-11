import type { PackageManifest } from "@rnx-kit/node-types";
import { deepEqual, equal, fail, ok, rejects } from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import prompts from "prompts";
import { makeSetVersionCommand as makeSetVersionCommandActual } from "../../src/commands/setVersion.ts";
import { defaultConfig } from "../../src/config.ts";
import type { Options } from "../../src/types.ts";
import * as mockfs from "../__mocks__/fs.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

type Result = {
  didWrite: boolean;
  manifest: Record<string, unknown>;
};

function makeSetVersionCommand(versions: string | number, options: Options) {
  return makeSetVersionCommandActual(
    versions,
    options,
    mockfs as unknown as typeof import("node:fs")
  );
}

describe("makeSetVersionCommand()", () => {
  function setupMocks(manifest: PackageManifest): Result {
    mockfs.__setMockContent(manifest);

    const result: Result = { didWrite: false, manifest: {} };
    mockfs.__setMockFileWriter((_, content) => {
      const updatedManifest = JSON.parse(content.toString());
      mockfs.__setMockContent(updatedManifest);

      result.didWrite = true;
      result.manifest = updatedManifest;
    });

    return result;
  }

  const options = {
    presets: defaultConfig.presets,
    loose: false,
    migrateConfig: false,
    noUnmanaged: false,
    verbose: false,
    write: false,
  };

  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  afterEach(() => {
    mockfs.__setMockContent({});
  });

  after(() => {
    undefineRequire();
  });

  it("rejects invalid version numbers", async () => {
    rejects(
      makeSetVersionCommand("latest", options),
      /'latest' is not a valid version number/
    );
  });

  it("rejects unsupported `react-native` versions", async () => {
    rejects(
      makeSetVersionCommand("0.59", options),
      /'0.59' is not a supported react-native version/
    );
  });

  it("skips unconfigured packages", async () => {
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

    equal(command("package.json"), "not-configured");
    ok(!result.didWrite);
  });

  it("skips partially configured packages", async () => {
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

    equal(command("package.json"), "invalid-configuration");
    ok(!result.didWrite);
  });

  it("updates `react-native` requirements", async () => {
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

    equal(command("package.json"), "success");
    deepEqual(result.manifest, {
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

  it("updates `react-native` requirements (backwards compatibility)", async () => {
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

    equal(command("package.json"), "success");
    deepEqual(result.manifest, {
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

  it("only modifies the 'react-native' requirement", async () => {
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

    equal(command("package.json"), "success");
    deepEqual(result.manifest, {
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

  it("prompts the user if no version is specified", async () => {
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

    equal(command("package.json"), "success");
    deepEqual(result.manifest, {
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

  it("skips the second prompt if only one version is supported", async () => {
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

    equal(command("package.json"), "success");
    deepEqual(result.manifest, {
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

  it('skips "dirty" packages', async () => {
    const mockManifest: PackageManifest = {
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

    const result = setupMocks(mockManifest);

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("", options);
    if (typeof command !== "function") {
      fail();
    }

    equal(command("package.json"), "unsatisfied");
    ok(!result.didWrite);
  });

  it("exits if the user cancels during prompts", async () => {
    prompts.inject([undefined]);
    equal(await makeSetVersionCommand("", options), undefined);

    prompts.inject([["0.63", "0.64"], undefined]);
    equal(await makeSetVersionCommand("", options), undefined);
  });
});
