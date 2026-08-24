import { equal } from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { remapReactNativeModule } from "../../src/remappers/remapReactNative.ts";
import type { ResolutionContextCompat } from "../../src/types.ts";
import { useFixture } from "../fixtures.ts";

const AVAILABLE_PLATFORMS = {
  macos: "react-native-macos",
  win32: "@office-iss/react-native-win32",
  windows: "react-native-windows",
};

describe("remapReactNativeModule", () => {
  const context = {
    originModulePath: "",
  } as ResolutionContextCompat;

  const currentDir = process.cwd();

  before(() => {
    process.chdir(useFixture("remap-platforms"));
  });

  after(() => {
    process.chdir(currentDir);
  });

  it("remaps `react-native` if platform is supported", () => {
    equal(remapReactNativeModule(context, "terminator", "macos"), "terminator");

    equal(
      remapReactNativeModule(context, "react-native", "nextstep"),
      "react-native"
    );

    for (const [platform, npmPackage] of Object.entries(AVAILABLE_PLATFORMS)) {
      equal(
        remapReactNativeModule(context, "react-native", platform),
        npmPackage
      );
    }
  });

  it("remaps paths under `react-native` if platform is supported", () => {
    const target = "react-native/index";

    equal(remapReactNativeModule(context, target, "nextstep"), target);

    for (const [platform, npmPackage] of Object.entries(AVAILABLE_PLATFORMS)) {
      equal(
        remapReactNativeModule(context, target, platform),
        `${npmPackage}/index`
      );
    }
  });
});
