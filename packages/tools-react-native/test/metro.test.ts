import * as os from "node:os";
import * as path from "node:path";
import { requireModuleFromMetro } from "../src/metro";

const nixOnlyTest = os.platform() === "win32" ? test.skip : test;

describe("requireModuleFromMetro", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {};

  function getMetroResolver(fromDir: string) {
    return requireModuleFromMetro("metro-resolver", fromDir).resolve;
  }

  test("returns `metro-resolver` installed by `react-native`", () => {
    const p = path.join(__dirname, "__fixtures__", "metro-resolver-duplicates");

    expect(getMetroResolver(p)(context, "", null)).toEqual(
      expect.stringContaining(
        path.join(
          "metro-resolver-duplicates",
          "node_modules",
          "@react-native-community",
          "cli-plugin-metro",
          "node_modules",
          "metro-resolver"
        )
      )
    );
  });

  // The symlinks under `pnpm` don't work on Windows
  nixOnlyTest("returns `metro-resolver` from a central storage", () => {
    const p = path.join(__dirname, "__fixtures__", "pnpm");

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
