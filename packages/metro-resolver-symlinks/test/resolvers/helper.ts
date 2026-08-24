import { resolve as metroResolver } from "metro-resolver";
import * as fs from "node:fs";
import * as path from "node:path";
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
    test("throws when a module cannot be found", () => {
      const context = makeContext(ignoredFixture);

      expect(() => resolve(context, "./does-not-exist")).toThrow(errors.failed);
    });

    test("returns an empty module for paths ignored by the `browser` field", () => {
      const context = makeContext(ignoredFixture);

      expect(resolve(context, "./ignored")).toEqual({ type: "empty" });
    });
  });
}
