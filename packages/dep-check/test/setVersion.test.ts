import prompts from "prompts";
import { makeSetVersionCommand } from "../src/setVersion";

jest.mock("fs");

describe("makeSetVersionCommand()", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

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
    const mockManifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0-test",
      dependencies: {
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        reactNativeVersion: "^0.63",
        kitType: "app",
        capabilities: ["core"],
      },
    };
    fs.__setMockContent(mockManifest);

    let updatedManifest: Record<string, unknown>;
    fs.__setMockFileWriter((_: string, content: string) => {
      updatedManifest = JSON.parse(content);
      fs.__setMockContent(updatedManifest);
      rnxKitConfig.__setMockConfig(updatedManifest["rnx-kit"]);
    });

    const command = await makeSetVersionCommand("0.64,0.63");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(updatedManifest).toEqual({
      ...mockManifest,
      dependencies: {
        "react-native": "^0.64.2",
      },
      devDependencies: {},
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.63.0 || ^0.64.0",
        reactNativeDevVersion: "^0.64.0",
      },
    });
  });

  test("prompts the user if no version is specified", async () => {
    const mockManifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0-test",
      dependencies: {
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        reactNativeVersion: "^0.63",
        kitType: "app",
        capabilities: ["core"],
      },
    };
    fs.__setMockContent(mockManifest);

    let updatedManifest: Record<string, unknown>;
    fs.__setMockFileWriter((_: string, content: string) => {
      updatedManifest = JSON.parse(content);
      fs.__setMockContent(updatedManifest);
      rnxKitConfig.__setMockConfig(updatedManifest["rnx-kit"]);
    });

    prompts.inject([["0.63", "0.64"], "0.64"]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(updatedManifest).toEqual({
      ...mockManifest,
      dependencies: {
        "react-native": "^0.64.2",
      },
      devDependencies: {},
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.63 || ^0.64",
        reactNativeDevVersion: "0.64",
      },
    });
  });

  test("skips the second prompt if only one version is supported", async () => {
    const mockManifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0-test",
      dependencies: {
        "react-native": "^0.63.2",
      },
      "rnx-kit": {
        reactNativeVersion: "^0.63",
        kitType: "app",
        capabilities: ["core"],
      },
    };
    fs.__setMockContent(mockManifest);

    let updatedManifest: Record<string, unknown>;
    fs.__setMockFileWriter((_: string, content: string) => {
      updatedManifest = JSON.parse(content);
      fs.__setMockContent(updatedManifest);
      rnxKitConfig.__setMockConfig(updatedManifest["rnx-kit"]);
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(updatedManifest).toEqual({
      ...mockManifest,
      dependencies: {
        "react-native": "^0.64.2",
      },
      devDependencies: {},
      "rnx-kit": {
        ...mockManifest["rnx-kit"],
        reactNativeVersion: "^0.64",
        reactNativeDevVersion: "0.64",
      },
    });
  });

  test('skips "dirty" packages', async () => {
    const mockManifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0-test",
      dependencies: {
        "react-native": "^0.62.3",
      },
      "rnx-kit": {
        reactNativeVersion: "^0.63",
        kitType: "app",
        capabilities: ["core"],
      },
    };
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig(mockManifest["rnx-kit"]);

    let updatedManifest = false;
    fs.__setMockFileWriter(() => {
      updatedManifest = true;
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).not.toBe(0);
    expect(updatedManifest).toBe(false);
  });

  test("skips unconfigured packages", async () => {
    const mockManifest = {
      name: "@rnx-kit/dep-check",
      version: "1.0.0-test",
      dependencies: {
        "react-native": "^0.63.2",
      },
    };
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig(mockManifest["rnx-kit"]);

    let updatedManifest = false;
    fs.__setMockFileWriter(() => {
      updatedManifest = true;
    });

    prompts.inject([["0.64"]]);

    const command = await makeSetVersionCommand("");
    expect(typeof command).toBe("function");
    expect(command("package.json")).toBe(0);
    expect(updatedManifest).toBe(false);
  });

  test("exits if the user cancels during prompts", async () => {
    prompts.inject([undefined]);
    expect(await makeSetVersionCommand("")).toBeUndefined();

    prompts.inject([["0.63", "0.64"], undefined]);
    expect(await makeSetVersionCommand("")).toBeUndefined();
  });
});
