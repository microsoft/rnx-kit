import { ok, throws } from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { requireModuleFromMetro } from "../src/metro";

describe("requireModuleFromMetro", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {};

  function getMetroResolver(fromDir: string) {
    return requireModuleFromMetro("metro-resolver", fromDir).resolve;
  }

  it("returns `metro-resolver` installed by `react-native`", () => {
    const p = path.join(__dirname, "__fixtures__", "metro-resolver-duplicates");

    ok(
      getMetroResolver(p)(context, "", null).includes(
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
  it(
    "returns `metro-resolver` from a central storage",
    { skip: process.platform === "win32" },
    () => {
      const p = path.join(__dirname, "__fixtures__", "pnpm");

      ok(
        getMetroResolver(p)(context, "", null).includes(
          path.join("pnpm", "node_modules", ".pnpm", "metro-resolver")
        )
      );
    }
  );

  it("throws if `metro-resolver` cannot be found", () => {
    const cwd = process.cwd();
    const root = cwd.substring(0, cwd.indexOf(path.sep) + 1);

    throws(
      () => getMetroResolver(root)(context, "", null),
      "Cannot find module"
    );
  });
});
