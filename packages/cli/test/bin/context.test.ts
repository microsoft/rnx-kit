import type { Command } from "@react-native-community/cli-types";
import { loadContextForCommand, uniquify } from "../../src/bin/context";
import { reactNativeConfig } from "../../src/index";

jest.mock("@rnx-kit/tools-react-native/context", () => ({
  resolveCommunityCLI: () => {
    throw new Error("Expected fast path");
  },
}));

describe("bin/context/uniquify()", () => {
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

describe("bin/context/loadContextForCommand()", () => {
  afterAll(() => {
    jest.resetAllMocks();
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
      expect(modified.name.startsWith("rnx-")).toBe(false);
      expect(modified.description).toBe(original.description);
      expect(modified.options).toEqual(original.options);
      expect(modified.func).toBe(original.func);
    }
  });
});
