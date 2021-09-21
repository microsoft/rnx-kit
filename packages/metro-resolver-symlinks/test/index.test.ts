import path from "path";
import {
  getMetroResolver,
  remapReactNativeModule,
  resolveModulePath,
} from "../src/resolver";

function useFixture(name: string): string {
  return path.join(__dirname, "__fixtures__", name);
}

describe("getMetroResolver", () => {
  test("returns `metro-resolver` installed by `react-native`", () => {
    const p = useFixture("metro-resolver-duplicates");
    expect(getMetroResolver(p)({} as any, "", null)).toEqual(
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

  test("throws if `metro-resolver` cannot be found", () => {
    const cwd = process.cwd();
    const root = cwd.substr(0, cwd.indexOf(path.sep) + 1);
    expect(() => getMetroResolver(root)({} as any, "", null)).toThrowError(
      "Cannot find module"
    );
  });
});

describe("remapReactNativeModule", () => {
  const availablePlatforms = {
    macos: "react-native-macos",
    win32: "@office-iss/react-native-win32",
    windows: "react-native-windows",
  };

  test("remaps `react-native` if platform is supported", () => {
    expect(
      remapReactNativeModule("terminator", "macos", availablePlatforms)
    ).toBe("terminator");

    expect(
      remapReactNativeModule("react-native", "nextstep", availablePlatforms)
    ).toBe("react-native");

    Object.entries(availablePlatforms).forEach(([platform, npmPackage]) => {
      expect(
        remapReactNativeModule("react-native", platform, availablePlatforms)
      ).toBe(npmPackage);
    });
  });

  test("remaps paths under `react-native` if platform is supported", () => {
    const target = "react-native/index";

    expect(remapReactNativeModule(target, "nextstep", availablePlatforms)).toBe(
      target
    );

    Object.entries(availablePlatforms).forEach(([platform, npmPackage]) => {
      expect(remapReactNativeModule(target, platform, availablePlatforms)).toBe(
        `${npmPackage}/index`
      );
    });
  });
});

describe("resolveModulePath", () => {
  test("returns absolute/relative modules as is", () => {
    expect(resolveModulePath("./terminator", "")).toBe("./terminator");
    expect(resolveModulePath("/terminator", "")).toBe("/terminator");
  });

  test("resolves module path relative to requester", () => {
    const p = useFixture("duplicates");
    expect(resolveModulePath("react-native", p)).toBe(
      `.${path.sep}${path.join("duplicates", "node_modules", "react-native")}`
    );
    expect(
      resolveModulePath(
        "react-native",
        path.join(p, "node_modules", "terminator")
      )
    ).toBe(
      `.${path.sep}${path.join("terminator", "node_modules", "react-native")}`
    );
  });
});
