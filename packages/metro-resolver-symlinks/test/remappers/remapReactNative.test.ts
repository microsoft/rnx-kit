import { remapReactNativeModule } from "../../src/remappers/remapReactNative";
import { useFixture } from "../fixtures";

const AVAILABLE_PLATFORMS = {
  macos: "react-native-macos",
  win32: "@office-iss/react-native-win32",
  windows: "react-native-windows",
};

describe("remapReactNativeModule", () => {
  const context = {
    originModulePath: "",
  };

  const currentDir = process.cwd();

  beforeAll(() => {
    process.chdir(useFixture("remap-platforms"));
  });

  afterAll(() => {
    process.chdir(currentDir);
  });

  test("remaps `react-native` if platform is supported", () => {
    expect(remapReactNativeModule(context, "terminator", "macos")).toBe(
      "terminator"
    );

    expect(remapReactNativeModule(context, "react-native", "nextstep")).toBe(
      "react-native"
    );

    Object.entries(AVAILABLE_PLATFORMS).forEach(([platform, npmPackage]) => {
      expect(remapReactNativeModule(context, "react-native", platform)).toBe(
        npmPackage
      );
    });
  });

  test("remaps paths under `react-native` if platform is supported", () => {
    const target = "react-native/index";

    expect(remapReactNativeModule(context, target, "nextstep")).toBe(target);

    Object.entries(AVAILABLE_PLATFORMS).forEach(([platform, npmPackage]) => {
      expect(remapReactNativeModule(context, target, platform)).toBe(
        `${npmPackage}/index`
      );
    });
  });
});
