import { remapImportPath } from "../src/utils/remapImportPath";

describe("remap-import-path", () => {
  const mockContext = {
    originModulePath: "",
  };

  const plugin = remapImportPath({
    test: (source) => source.startsWith("@contoso/"),
  });

  const currentWorkingDirectory = process.cwd();

  beforeAll(() => {
    process.chdir(`${__dirname}/__fixtures__/remap-import-path`);
  });

  afterAll(() => {
    process.chdir(currentWorkingDirectory);
  });

  test("throws if test function is missing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    [
      ["./lib/index", "./lib/index"],
      ["@rnx-kit/metro-resolver-symlinks", "@rnx-kit/metro-resolver-symlinks"],
      ["@contoso/example", "node_modules/@contoso/example/src/index.tsx"],
      [
        "@contoso/example/lib/index",
        "node_modules/@contoso/example/src/index.tsx",
      ],
      ["@contoso/example/dist/index", "@contoso/example/dist/index"],
    ].forEach(([request, resolved]) => {
      const result = plugin(mockContext, request, "ios");
      expect(result).toEqual(expect.stringContaining(resolved));
    });
  });

  test("resolves platform extensions", () => {
    [
      ["android", "android"],
      ["ios", "ios"],
      ["macos", "native"],
      ["win32", "win"],
      ["windows", "windows"],
    ].forEach(([platform, expected]) => {
      const plugin = remapImportPath({
        test: (source) => source.startsWith("@contoso/"),
      });
      const result = plugin(
        mockContext,
        "@contoso/platform/lib/index",
        platform
      );
      expect(result).toEqual(
        expect.stringContaining(
          `node_modules/@contoso/platform/src/index.${expected}.ts`
        )
      );
    });
  });

  test("resolves with custom main fields", () => {
    const customPlugin = remapImportPath({
      test: (source) => source.startsWith("@contoso/"),
      mainFields: ["react-native"],
    });
    expect(() => plugin(mockContext, "@contoso/exotic", "ios")).toThrow(
      "A main field (e.g. module, main) is missing"
    );
    expect(customPlugin(mockContext, "@contoso/exotic", "ios")).toEqual(
      expect.stringContaining("node_modules/@contoso/exotic/src/index.ts")
    );
  });
});
