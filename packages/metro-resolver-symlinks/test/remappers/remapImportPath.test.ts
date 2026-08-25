import { equal, ok, throws } from "node:assert/strict";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, before, describe, it, mock } from "node:test";
import { URL } from "node:url";
import { remapImportPath } from "../../src/remappers/remapImportPath.ts";
import type { ResolutionContextCompat } from "../../src/types.ts";
import { useFixture } from "../fixtures.ts";

const nodeRequire = createRequire(
  new URL("../../src/remappers/remapImportPath.ts", import.meta.url)
);

const mockedEnhancedResolve = (() => {
  const { create, ...enhancedResolve } = nodeRequire("enhanced-resolve");

  // `create.sync` is a non-configurable getter, so it cannot be spied on
  // directly. Wrap it in a mock that delegates to the real implementation.
  const createSync = mock.fn(create.sync);
  const wrappedCreate = (...args: Parameters<typeof create>) => create(...args);
  wrappedCreate.sync = createSync;

  return { ...enhancedResolve, create: wrappedCreate };
})();

describe("remap-import-path", () => {
  const mockContext = {
    originModulePath: "",
  } as ResolutionContextCompat;

  const plugin = remapImportPath({
    test: (source) => source.startsWith("@contoso/"),
  });

  const currentWorkingDirectory = process.cwd();

  before(() => {
    // Return the mocked `enhanced-resolve` so that `create.sync` can be spied
    // on, while delegating everything else to the real `require`.
    global.require = ((id: string) =>
      id === "enhanced-resolve"
        ? mockedEnhancedResolve
        : nodeRequire(id)) as NodeJS.Require;
    process.chdir(useFixture("remap-import-path"));
  });

  after(() => {
    process.chdir(currentWorkingDirectory);
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  it("throws if test function is missing", () => {
    throws(
      // @ts-expect-error Intentionally missing test function
      () => remapImportPath(),
      /A test function is required for this plugin/
    );
    throws(
      // oxlint-disable-next-line typescript/no-explicit-any
      () => remapImportPath({} as any),
      /Expected option `test` to be a function/
    );
  });

  it("throws if a module could not be resolved", () => {
    throws(
      () => plugin(mockContext, "@contoso/does-not-exist", "ios"),
      /Can't resolve/
    );
  });

  it("remaps `lib/` -> `src/`", () => {
    const cases = [
      ["./lib/index", "./lib/index"],
      ["@rnx-kit/metro-resolver-symlinks", "@rnx-kit/metro-resolver-symlinks"],
      [
        "@contoso/example",
        path.join("node_modules", "@contoso", "example", "src", "index.tsx"),
      ],
      [
        "@contoso/example/lib/index",
        path.join("node_modules", "@contoso", "example", "src", "index.tsx"),
      ],
      ["@contoso/example/dist/index", "@contoso/example/dist/index"],
      [
        "@contoso/relative",
        path.join("node_modules", "@contoso", "relative", "src", "index.ts"),
      ],
    ] as const;
    for (const [request, resolved] of cases) {
      const result = plugin(mockContext, request, "ios");
      ok(result.includes(resolved));
    }
  });

  it("resolves platform extensions", () => {
    const cases = [
      ["android", "android"],
      ["ios", "ios"],
      ["macos", "native"],
      ["win32", "win"],
      ["windows", "windows"],
    ] as const;

    // A single plugin instance serves every platform that a Metro server is
    // asked to bundle for, so exercise all of them through one instance.
    const plugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
    });

    for (const [platform, expected] of cases) {
      const result = plugin(
        mockContext,
        "@contoso/platform/lib/index",
        platform
      );
      ok(
        result.includes(
          path.join(
            "node_modules",
            "@contoso",
            "platform",
            "src",
            `index.${expected}.ts`
          )
        )
      );
    }
  });

  it("reuses the resolver when the platform is unchanged", () => {
    const createSync = mockedEnhancedResolve.create.sync;
    createSync.mock.resetCalls();

    const plugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
    });

    plugin(mockContext, "@contoso/platform/lib/index", "ios");
    plugin(mockContext, "@contoso/platform/lib/index", "ios");
    equal(createSync.mock.callCount(), 1);

    plugin(mockContext, "@contoso/platform/lib/index", "android");
    equal(createSync.mock.callCount(), 2);

    plugin(mockContext, "@contoso/platform/lib/index", "android");
    equal(createSync.mock.callCount(), 2);
  });

  it("resolves with custom main fields", () => {
    throws(
      () => plugin(mockContext, "@contoso/exotic", "ios"),
      /A main field \(e\.g\. module, main\) is missing/
    );

    const customPlugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
      mainFields: ["react-native"],
    });

    ok(
      customPlugin(mockContext, "@contoso/exotic", "ios").includes(
        path.join("node_modules", "@contoso", "exotic", "src", "index.ts")
      )
    );
  });
});
