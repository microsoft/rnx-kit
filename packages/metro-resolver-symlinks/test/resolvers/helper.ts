import { resolve as metroResolver } from "metro-resolver";
import { deepEqual, throws } from "node:assert/strict";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import type { CallResolver, ResolutionContextCompat } from "../../src/types.ts";
import { useFixture } from "../fixtures.ts";

export function makeResolverTest(
  name: string,
  resolver: CallResolver,
  errors: { failed: string }
) {
  const ignoredFixture = path.join(useFixture("ignored-module"), "index.js");

  function makeContext(originModulePath: string): ResolutionContextCompat {
    return {
      originModulePath,
      fileSystemLookup: (absoluteOrProjectRelativePath: string) => {
        if (!fs.existsSync(absoluteOrProjectRelativePath)) {
          return { exists: false };
        }

        const stat = fs.statSync(absoluteOrProjectRelativePath);
        return {
          exists: true,
          type: stat.isFile() ? "f" : "d",
          realPath: path.resolve(absoluteOrProjectRelativePath),
        };
      },
      getPackageForModule: (absoluteModulePath: string) => {
        return absoluteModulePath ? undefined : null;
      },
      mainFields: ["react-native", "browser", "main"],
      redirectModulePath: (modulePath: string) => {
        return modulePath !== "./ignored" && modulePath;
      },
      sourceExts: ["js"],
    } as unknown as ResolutionContextCompat;
  }

  function resolve(context: ResolutionContextCompat, moduleName: string) {
    return resolver(metroResolver, context, moduleName, "ios");
  }

  describe(name, () => {
    before(() => {
      global.require = createRequire(
        new URL("../../src/resolvers/metro-resolver.ts", import.meta.url)
      );
    });

    after(() => {
      // @ts-expect-error Tests are run in ESM mode where `require` is not defined
      global.require = undefined;
    });

    it("throws when a module cannot be found", () => {
      const context = makeContext(ignoredFixture);

      throws(() => resolve(context, "./does-not-exist"), errors.failed);
    });

    it("returns an empty module for paths ignored by the `browser` field", () => {
      const context = makeContext(ignoredFixture);

      deepEqual(resolve(context, "./ignored"), { type: "empty" });
    });
  });
}
