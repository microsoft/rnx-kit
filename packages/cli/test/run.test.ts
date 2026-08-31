import type { Config } from "@react-native-community/cli-types";
import { rnxBuildCommand } from "../src/build.ts";
import type { InputParams } from "../src/build/types.ts";
import { rnxRun, rnxRunCommand } from "../src/run.ts";

jest.mock("../src/run/android.ts", () => ({
  runAndroid: jest.fn(() => Promise.resolve("android")),
}));
jest.mock("../src/run/ios.ts", () => ({
  runIOS: jest.fn(() => Promise.resolve("ios")),
}));
jest.mock("../src/run/macos.ts", () => ({
  runMacOS: jest.fn(() => Promise.resolve("macos")),
}));
jest.mock("../src/run/windows.ts", () => ({
  runWindows: jest.fn(() => Promise.resolve("windows")),
}));

describe("rnx-run", () => {
  it("extends the build command options with `--device`", () => {
    for (const option of rnxBuildCommand.options) {
      expect(rnxRunCommand.options).toContainEqual(option);
    }

    const device = rnxRunCommand.options.find((opt) =>
      opt.name.startsWith("-d, --device")
    );

    expect(device).toBeDefined();
  });
});

describe("rnxRun", () => {
  const { runAndroid } = require("../src/run/android.ts");
  const { runIOS } = require("../src/run/ios.ts");
  const { runMacOS } = require("../src/run/macos.ts");
  const { runWindows } = require("../src/run/windows.ts");

  const config = {} as Config;
  const argv: string[] = [];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to `runAndroid` for 'android'", async () => {
    const buildParams = { platform: "android" } as InputParams;
    await rnxRun(argv, config, buildParams);

    expect(runIOS).not.toHaveBeenCalled();
    expect(runMacOS).not.toHaveBeenCalled();
    expect(runWindows).not.toHaveBeenCalled();
    expect(runAndroid).toHaveBeenCalledWith(config, buildParams, argv);
  });

  it.each(["ios", "visionos"] as const)(
    "delegates to `runIOS` for '%s'",
    async (platform) => {
      const buildParams = { platform } as InputParams;
      await rnxRun(argv, config, buildParams);

      expect(runAndroid).not.toHaveBeenCalled();
      expect(runMacOS).not.toHaveBeenCalled();
      expect(runWindows).not.toHaveBeenCalled();
      expect(runIOS).toHaveBeenCalledWith(config, buildParams);
    }
  );

  it("delegates to `runMacOS` for 'macos'", async () => {
    const buildParams = { platform: "macos" } as InputParams;
    await rnxRun(argv, config, buildParams);

    expect(runAndroid).not.toHaveBeenCalled();
    expect(runIOS).not.toHaveBeenCalled();
    expect(runWindows).not.toHaveBeenCalled();
    expect(runMacOS).toHaveBeenCalledWith(config, buildParams);
  });

  it("delegates to `runWindows` for 'windows'", async () => {
    const buildParams = { platform: "windows" } as InputParams;
    await rnxRun(argv, config, buildParams);

    expect(runAndroid).not.toHaveBeenCalled();
    expect(runIOS).not.toHaveBeenCalled();
    expect(runMacOS).not.toHaveBeenCalled();
    expect(runWindows).toHaveBeenCalledWith(config, buildParams, argv);
  });
});
