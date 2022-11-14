import * as os from "os";
import * as path from "path";
import { requireModuleFromMetro } from "../src/helper";
import { remapReactNativeModule, resolveModulePath } from "../src/resolver";
import { useFixture } from "./fixtures";

const AVAILABLE_PLATFORMS = {
  macos: "react-native-macos",
  win32: "@office-iss/react-native-win32",
  windows: "react-native-windows",
};

const nixOnlyTest = os.platform() === "win32" ? test.skip : test;

function getMetroResolver(fromDir: string) {
  return requireModuleFromMetro<typeof import("metro-resolver")>(
    "metro-resolver",
    fromDir
  ).resolve;
}

describe("getMetroResolver", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {};

  test("returns `metro-resolver` installed by `react-native`", () => {
    const p = useFixture("metro-resolver-duplicates");
    expect(getMetroResolver(p)(context, "", null)).toEqual(
      expect.stringContaining(
        path.join(
          "metro-resolver-duplicates",
          "node_modules",
          "@react-native-community",
          "cli",
          "node_modules",
          "metro-resolver"
        )
      )
    );
  });

  // The symlinks under `pnpm` don't work on Windows
  nixOnlyTest("returns `metro-resolver` from a central storage", () => {
    const p = useFixture("pnpm");
    expect(getMetroResolver(p)(context, "", null)).toEqual(
      expect.stringContaining(
        path.join("pnpm", "node_modules", ".pnpm", "metro-resolver")
      )
    );
  });

  test("throws if `metro-resolver` cannot be found", () => {
    const cwd = process.cwd();
    const root = cwd.substring(0, cwd.indexOf(path.sep) + 1);
    expect(() => getMetroResolver(root)(context, "", null)).toThrowError(
      "Cannot find module"
    );
  });
});

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
