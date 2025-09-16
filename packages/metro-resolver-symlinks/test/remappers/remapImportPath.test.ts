import * as path from "node:path";
import { remapImportPath } from "../../src/remappers/remapImportPath";

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
    for (const [platform, expected] of cases) {
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
