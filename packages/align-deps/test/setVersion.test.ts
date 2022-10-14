import type { PackageManifest } from "@rnx-kit/tools-node/package";
import prompts from "prompts";
import { makeSetVersionCommand } from "../src/setVersion";

jest.mock("fs");

type Result = {
  didWrite: boolean;
  manifest: Record<string, unknown>;
};

xdescribe("makeSetVersionCommand()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  function setupMocks(manifest: PackageManifest): Result {
    fs.__setMockContent(manifest);

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

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "1.0.0-test",
    dependencies: {
      react: "16.13.1",
      "react-native": "^0.63.2",
    },
    devDependencies: {},
    "rnx-kit": {
      reactNativeVersion: "^0.63",
      kitType: "app",
      capabilities: ["core"],
    },
  };

  afterEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
    jest.clearAllMocks();
  });

  test("rejects unsupported versions `react-native`", async () => {
    expect(makeSetVersionCommand("0.59")).rejects.toEqual(
      expect.objectContaining({
        message: expect.stringContaining(
          "Unsupported 'react-native' version/range:"
        ),
      })
    );
  });

  test("updates dependencies", async () => {
    const result = setupMocks({
      ...mockManifest,
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        kitType: "library",
        reactNativeDevVersion: "^0.63.0",
      },
    });

    const command = await makeSetVersionCommand("0.64,0.63");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(result.manifest).toEqual({
      ...mockManifest,
      dependencies: undefined,
      devDependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      peerDependencies: {
        react: "16.13.1 || 17.0.1",
        "react-native": "^0.63.2 || ^0.64.2",
      },
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        kitType: "library",
        reactNativeVersion: "^0.63.0 || ^0.64.0",
        reactNativeDevVersion: "^0.64.0",
      },
    });
  });

  test("removes `reactNativeDevVersion` if `kitType` is `app`", async () => {
    const result = setupMocks({
      ...mockManifest,
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeDevVersion: "^0.63.0",
      },
    });

    const command = await makeSetVersionCommand("0.64,0.63");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(result.manifest).toEqual({
      ...mockManifest,
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      devDependencies: undefined,
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.63.0 || ^0.64.0",
      },
    });
  });

  test("prompts the user if no version is specified", async () => {
    const result = setupMocks(mockManifest);

    prompts.inject([["0.63", "0.64"], "0.64"]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(result.manifest).toEqual({
      ...mockManifest,
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      devDependencies: undefined,
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.63 || ^0.64",
      },
    });
  });

  test("skips the second prompt if only one version is supported", async () => {
    const result = setupMocks(mockManifest);

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(result.manifest).toEqual({
      ...mockManifest,
      dependencies: {
        react: "17.0.1",
        "react-native": "^0.64.2",
      },
      devDependencies: undefined,
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.64",
      },
    });
  });

  test('skips "dirty" packages', async () => {
    rnxKitConfig.__setMockConfig(mockManifest["rnx-kit"]);
    const result = setupMocks({
      ...mockManifest,
      dependencies: {
        "react-native": "^0.62.3",
      },
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).not.toBe(0);
    expect(result.didWrite).toBe(false);
  });

  test("skips unconfigured packages", async () => {
    const result = setupMocks({
      ...mockManifest,
      "rnx-kit": undefined,
    } as PackageManifest);

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(result.didWrite).toBe(false);
  });

  test("exits if the user cancels during prompts", async () => {
    prompts.inject([undefined]);
    expect(await makeSetVersionCommand("")).toBeUndefined();

    prompts.inject([["0.63", "0.64"], undefined]);
    expect(await makeSetVersionCommand("")).toBeUndefined();
  });
});
