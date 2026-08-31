import type { Config } from "@react-native-community/cli-types";
import { rnxBuild, rnxBuildCommand } from "../src/build.ts";
import type { InputParams } from "../src/build/types.ts";

jest.mock("../src/build/android.ts", () => ({
  buildAndroid: jest.fn(() => Promise.resolve("android")),
}));
jest.mock("../src/build/ios.ts", () => ({
  buildIOS: jest.fn(() => Promise.resolve("ios")),
}));
jest.mock("../src/build/macos.ts", () => ({
  buildMacOS: jest.fn(() => Promise.resolve("macos")),
}));
jest.mock("../src/build/windows.ts", () => ({
  buildWindows: jest.fn(() => Promise.resolve("windows")),
}));

describe("rnx-build", () => {
  function findParser(name: string) {
    const option = rnxBuildCommand.options.find((opt) =>
      opt.name.startsWith(name)
    );
    if (!option?.parse) {
      throw new Error(`Could not find a parser for '${name}'`);
    }
    return option.parse;
  }

  it("validates `--platform`", () => {
    const parse = findParser("-p, --platform");

    for (const platform of ["android", "ios", "macos", "visionos", "windows"]) {
      expect(parse(platform)).toBe(platform);
    }
    expect(() => parse("platform")).toThrow();
    expect(() => parse("")).toThrow();
  });

  it("validates `--configuration`", () => {
    const parse = findParser("--configuration");

    expect(parse("Debug")).toBe("Debug");
    expect(parse("Release")).toBe("Release");
    expect(() => parse("Profile")).toThrow();
    expect(() => parse("")).toThrow();
  });

  it("validates `--destination`", () => {
    const parse = findParser("--destination");

    for (const destination of ["device", "emulator", "simulator"]) {
      expect(parse(destination)).toBe(destination);
    }
    expect(() => parse("cloud")).toThrow();
    expect(() => parse("")).toThrow();
  });
});

describe("rnxBuild", () => {
  const { buildAndroid } = require("../src/build/android.ts");
  const { buildIOS } = require("../src/build/ios.ts");
  const { buildMacOS } = require("../src/build/macos.ts");
  const { buildWindows } = require("../src/build/windows.ts");

  const config = {} as Config;
  const argv: string[] = [];

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("delegates to `buildAndroid` for 'android'", async () => {
    const buildParams = { platform: "android" } as InputParams;
    await rnxBuild(argv, config, buildParams);

    expect(buildIOS).not.toHaveBeenCalled();
    expect(buildMacOS).not.toHaveBeenCalled();
    expect(buildWindows).not.toHaveBeenCalled();
    expect(buildAndroid).toHaveBeenCalledWith(config, buildParams, argv);
  });

  it.each(["ios", "visionos"] as const)(
    "delegates to `buildIOS` for '%s'",
    async (platform) => {
      const buildParams = { platform } as InputParams;
      await rnxBuild(argv, config, buildParams);

      expect(buildAndroid).not.toHaveBeenCalled();
      expect(buildMacOS).not.toHaveBeenCalled();
      expect(buildWindows).not.toHaveBeenCalled();
      expect(buildIOS).toHaveBeenCalledWith(config, buildParams);
    }
  );

  it("delegates to `buildMacOS` for 'macos'", async () => {
    const buildParams = { platform: "macos" } as InputParams;
    await rnxBuild(argv, config, buildParams);

    expect(buildAndroid).not.toHaveBeenCalled();
    expect(buildIOS).not.toHaveBeenCalled();
    expect(buildWindows).not.toHaveBeenCalled();
    expect(buildMacOS).toHaveBeenCalledWith(config, buildParams);
  });

  it("delegates to `buildWindows` for 'windows'", async () => {
    const buildParams = { platform: "windows" } as InputParams;
    await rnxBuild(argv, config, buildParams);

    expect(buildAndroid).not.toHaveBeenCalled();
    expect(buildIOS).not.toHaveBeenCalled();
    expect(buildMacOS).not.toHaveBeenCalled();
    expect(buildWindows).toHaveBeenCalledWith(config, buildParams, argv);
  });
});
