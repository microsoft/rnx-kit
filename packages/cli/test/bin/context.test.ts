import type { Command } from "@react-native-community/cli-types";
import { RNX_PREFIX } from "../../src/bin/constants.ts";
import {
  loadContextForCommand,
  renameCommand,
  uniquify,
} from "../../src/bin/context.ts";
import { reactNativeConfig } from "../../src/index.ts";

const mockFindDir = jest.fn();
const mockReadPackage = jest.fn();
jest.mock("@rnx-kit/tools-node/package", () => ({
  findPackageDependencyDir: (...args: unknown[]) => mockFindDir(...args),
  readPackage: (...args: unknown[]) => mockReadPackage(...args),
}));

jest.mock("@rnx-kit/tools-react-native/context", () => ({
  resolveCommunityCLI: () => {
    throw new Error("Expected fast path");
  },
}));

describe("renameCommand", () => {
  const noop = () => undefined;

  it("renames a command without modifying the original", () => {
    const command = {
      name: "rnx-start",
      description: "start command",
      func: noop,
    };

    const renamed = renameCommand(command, "start");

    expect(renamed).not.toBe(command);
    expect(renamed.name).toBe("start");
    expect(renamed.description).toBe(command.description);
    expect(command.name).toBe("rnx-start");
  });

  it("does not evaluate getters eagerly", () => {
    const optionsGetter = jest.fn(() => ["--platform"]);
    const command = {
      name: "rnx-test",
      func: noop,
      get options() {
        return optionsGetter();
      },
    } as unknown as Command;

    const renamed = renameCommand(command, "test");

    expect(optionsGetter).not.toHaveBeenCalled();

    expect(renamed.options).toEqual(["--platform"]);
    expect(optionsGetter).toHaveBeenCalledTimes(1);
  });

  it("preserves getters as getters on the renamed command", () => {
    const command = {
      name: "rnx-test",
      func: noop,
      get options() {
        return ["--platform"];
      },
    } as unknown as Command;

    const renamed = renameCommand(command, "test");

    const descriptor = Object.getOwnPropertyDescriptor(renamed, "options");
    expect(typeof descriptor?.get).toBe("function");
  });
});

describe("uniquify", () => {
  function makeCommand(name: string, description: string): Command<false> {
    return { name, description } as Command<false>;
  }

  it("ignores duplicate commands", () => {
    const start = makeCommand("start", "first start command");
    const start2 = makeCommand("start", "second start command");

    expect(uniquify([start, start2])).toMatchObject([start]);
  });

  it("replaces existing commands with rnx", () => {
    const start = makeCommand("start", "original start command");
    const rnxBundle = makeCommand("rnx-bundle", "rnx-bundle command");
    const rnxStart = makeCommand("rnx-start", "rnx-start command");

    expect(uniquify([start, rnxBundle, rnxStart])).toMatchObject([
      { name: "start", description: "rnx-start command" },
      { name: "bundle", description: "rnx-bundle command" },
    ]);
  });
});

describe("loadContextForCommand", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it("lazily resolves `reactNativePath`", async () => {
    const reactNativePath = "/repo/node_modules/react-native";
    mockFindDir.mockReturnValue(reactNativePath);

    const config = await loadContextForCommand("start");

    // Not resolved until accessed
    expect(mockFindDir).not.toHaveBeenCalled();
    expect(config.reactNativePath).toBe(reactNativePath);
    expect(mockFindDir).toHaveBeenCalledTimes(1);

    // Cached on subsequent access
    expect(config.reactNativePath).toBe(reactNativePath);
    expect(mockFindDir).toHaveBeenCalledTimes(1);
  });

  it("lazily resolves `reactNativeVersion`", async () => {
    const version = "0.0.0-dev";
    mockFindDir.mockReturnValue("/repo/node_modules/react-native");
    mockReadPackage.mockReturnValue({ version });

    const config = await loadContextForCommand("start");

    // Not resolved until accessed
    expect(config.reactNativeVersion).toBe(version);
    expect(mockReadPackage).toHaveBeenCalledTimes(1);

    // Cached on subsequent access.
    expect(config.reactNativeVersion).toBe(version);
    expect(mockReadPackage).toHaveBeenCalledTimes(1);
  });

  it("throws when `react-native` cannot be resolved", async () => {
    mockFindDir.mockReturnValue(undefined);

    const config = await loadContextForCommand("start");

    expect(() => config.reactNativePath).toThrow(
      "Unable to resolve module 'react-native'"
    );
  });

  it("throws on unexpected access to lazy-only fields", async () => {
    const config = await loadContextForCommand("start");

    expect(() => config.dependencies).toThrow(
      "Unexpected access to `dependencies`"
    );
    expect(() => config.healthChecks).toThrow(
      "Unexpected access to `healthChecks`"
    );
    expect(() => config.platforms).toThrow("Unexpected access to `platforms`");
    expect(() => config.project).toThrow("Unexpected access to `project`");
  });

  it("uses full code path for other commands", async () => {
    const fastPath = "Expected fast path";

    const runAndroid = loadContextForCommand("run-android");
    const runIOS = loadContextForCommand("run-ios");

    await expect(runAndroid).rejects.toThrow(fastPath);
    await expect(runIOS).rejects.toThrow(fastPath);
  });

  it("strips `rnx-` prefix from all commands", async () => {
    const { commands } = await loadContextForCommand("start");

    for (let i = 0; i < commands.length; ++i) {
      const modified = commands[i];
      const original = reactNativeConfig.commands[i];

      expect(modified).not.toBe(original);
      expect(modified.name.startsWith(RNX_PREFIX)).toBe(false);
      expect(modified.description).toBe(original.description);
      expect(modified.options).toEqual(original.options);
      expect(modified.func).toBe(original.func);
    }
  });
});
