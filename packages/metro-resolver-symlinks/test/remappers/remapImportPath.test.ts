import { create } from "enhanced-resolve";
import * as path from "node:path";
import { remapImportPath } from "../../src/remappers/remapImportPath.ts";

// `create.sync` is a non-configurable getter, so it cannot be spied on
// directly. Wrap it in a mock that still delegates to the real implementation.
jest.mock("enhanced-resolve", () => {
  const actual =
    jest.requireActual<typeof import("enhanced-resolve")>("enhanced-resolve");
  const create = (...args: Parameters<typeof actual.create>) =>
    actual.create(...args);
  create.sync = jest.fn((...args: Parameters<typeof actual.create.sync>) =>
    actual.create.sync(...args)
  );
  return { ...actual, create };
});

describe("remap-import-path", () => {
  const mockContext = {
    originModulePath: "",
  };

  const plugin = remapImportPath({
    test: (source) => source.startsWith("@contoso/"),
  });

  const currentWorkingDirectory = process.cwd();

  beforeAll(() => {
    process.chdir(`${__dirname}/../__fixtures__/remap-import-path`);
  });

  afterAll(() => {
    process.chdir(currentWorkingDirectory);
  });

  test("throws if test function is missing", () => {
    // @ts-expect-error Intentionally missing test function
    expect(() => remapImportPath()).toThrow(
      "A test function is required for this plugin"
    );
    // oxlint-disable-next-line typescript/no-explicit-any
    expect(() => remapImportPath({} as any)).toThrow(
      "Expected option `test` to be a function"
    );
  });

  test("throws if a module could not be resolved", () => {
    expect(() => plugin(mockContext, "@contoso/does-not-exist", "ios")).toThrow(
      "Can't resolve"
    );
  });

  test("remaps `lib/` -> `src/`", () => {
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
      expect(result).toEqual(expect.stringContaining(resolved));
    }
  });

  test("resolves platform extensions", () => {
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
      expect(result).toEqual(
        expect.stringContaining(
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

  test("reuses the resolver when the platform is unchanged", () => {
    const createSync = jest.mocked(create.sync);
    createSync.mockClear();

    const plugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
    });

    plugin(mockContext, "@contoso/platform/lib/index", "ios");
    plugin(mockContext, "@contoso/platform/lib/index", "ios");
    expect(createSync).toHaveBeenCalledTimes(1);

    plugin(mockContext, "@contoso/platform/lib/index", "android");
    expect(createSync).toHaveBeenCalledTimes(2);

    plugin(mockContext, "@contoso/platform/lib/index", "android");
    expect(createSync).toHaveBeenCalledTimes(2);
  });

  test("resolves with custom main fields", () => {
    expect(() => plugin(mockContext, "@contoso/exotic", "ios")).toThrow(
      "A main field (e.g. module, main) is missing"
    );

    const customPlugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
      mainFields: ["react-native"],
    });

    expect(customPlugin(mockContext, "@contoso/exotic", "ios")).toEqual(
      expect.stringContaining(
        path.join("node_modules", "@contoso", "exotic", "src", "index.ts")
      )
    );
  });
});
