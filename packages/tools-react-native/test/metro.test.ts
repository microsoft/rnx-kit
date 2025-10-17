import { ok, throws } from "node:assert/strict";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { URL } from "node:url";
import { requireModuleFromMetro } from "../src/metro.ts";
import { fixturePath } from "./fixtures.ts";

describe("requireModuleFromMetro", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context: any = {};

  function getMetroResolver(fromDir: string) {
    return requireModuleFromMetro("metro-resolver", fromDir).resolve;
  }

  before(() => {
    global.require = createRequire(new URL("../src/metro.ts", import.meta.url));
  });

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  it("returns `metro-resolver` installed by `react-native`", () => {
    const p = fixturePath("metro-resolver-duplicates");

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
      const p = fixturePath("pnpm");

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
