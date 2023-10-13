import * as path from "node:path";
import { remapReactNativeModule, resolveModulePath } from "../src/resolver";
import { useFixture } from "./fixtures";

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

describe("resolveModulePath", () => {
  function makeContext(originModulePath: string) {
    return { originModulePath };
  }

  test("returns absolute/relative modules as is", () => {
    expect(resolveModulePath(makeContext(""), "./terminator", "")).toBe(
      "./terminator"
    );
    expect(resolveModulePath(makeContext(""), "/terminator", "")).toBe(
      "/terminator"
    );
  });

  test("resolves module path relative to requester", () => {
    const p = useFixture("duplicates");
    expect(resolveModulePath(makeContext(p), "react-native", "")).toBe(
      `.${path.sep}${path.join("duplicates", "node_modules", "react-native")}`
    );
    expect(
      resolveModulePath(
        makeContext(path.join(p, "node_modules", "terminator")),
        "react-native",
        ""
      )
    ).toBe(
      `.${path.sep}${path.join("terminator", "node_modules", "react-native")}`
    );
  });
});
