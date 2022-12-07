import ts from "typescript";
import {
  getCompilerOptionsWithReactNativeModuleSuffixes,
  resolveModuleNames,
  resolveTypeReferenceDirectives,
} from "../src/resolver";
import type { ResolverContext } from "../src/types";

describe("Resolver", () => {
  const context: ResolverContext = {
    host: {} as unknown as ts.LanguageServiceHost,
    disableReactNativePackageSubstitution: false,
    platform: "ios",
    platformFileExtensions: [".ios", ".native", ""],
    replaceReactNativePackageName: (x: string) => x + "-replaced",
  };

  test("resolves modules", () => {
    const origTsResolveModuleName = ts.resolveModuleName;
    const mockTsResolveModuleName = jest.fn();
    ts.resolveModuleName = mockTsResolveModuleName;
    try {
      mockTsResolveModuleName
        .mockReturnValueOnce({ resolvedModule: { resolvedFileName: "first" } })
        .mockReturnValueOnce({
          resolvedModule: { resolvedFileName: "second" },
        });

      const modules = resolveModuleNames(
        context,
        ["pkg-dir", "pkg-up"],
        "/repos/rnx-kit/packages/test-app/src/app.ts",
        undefined,
        undefined,
        {},
        undefined
      );

      expect(mockTsResolveModuleName).toHaveBeenCalledTimes(2);
      const calls = mockTsResolveModuleName.mock.calls;
      // 1st param: module name
      expect(calls[0][0]).toEqual("pkg-dir-replaced");
      expect(calls[1][0]).toEqual("pkg-up-replaced");
      // 3rd param: CompilerOptions
      expect(calls[0][2]).toContainEntry([
        "moduleSuffixes",
        [".ios", ".native", ""],
      ]);
      expect(calls[1][2]).toContainEntry([
        "moduleSuffixes",
        [".ios", ".native", ""],
      ]);

      expect(modules).not.toBeNil();
      expect(modules).toBeArrayOfSize(2);
      expect(modules[0]).toEqual({ resolvedFileName: "first" });
      expect(modules[1]).toEqual({ resolvedFileName: "second" });
    } finally {
      ts.resolveModuleName = origTsResolveModuleName;
    }
  });

  test("adds moduleSuffixes when it is not present", () => {
    // platform is ios, and is set by context.platform. moduleSuffixes must be set
    // to the list of ios-related extensions.
    const inputOptions = {};
    const outputOptions = getCompilerOptionsWithReactNativeModuleSuffixes(
      context,
      "module",
      "containing-file",
      inputOptions
    );
    expect(outputOptions).toContainEntry([
      "moduleSuffixes",
      [".ios", ".native", ""],
    ]);
  });

  test("verifies that moduleSuffixes is valid when it is already present", () => {
    // platform is ios, and is set by context.platform. moduleSuffixes must have
    // all of the ios-related extensions, in order, but can have others mixed in.
    const inputOptions = {
      moduleSuffixes: [
        ".goobers",
        ".ios",
        ".milk-duds",
        ".lemonheads",
        ".native",
        "",
        ".snickers",
      ],
    };
    const outputOptions = getCompilerOptionsWithReactNativeModuleSuffixes(
      context,
      "module",
      "containing-file",
      inputOptions
    );
    expect(outputOptions).toContainEntry([
      "moduleSuffixes",
      inputOptions.moduleSuffixes, // output must match input
    ]);
  });

  test("fails when moduleSuffixes is set, but is invalid for the target platform", () => {
    const inputOptions = {
      moduleSuffixes: ["this isn't going to work"],
    };
    expect(() =>
      getCompilerOptionsWithReactNativeModuleSuffixes(
        context,
        "module",
        "containing-file",
        inputOptions
      )
    ).toThrowError();
  });

  test("resolves type reference directives", () => {
    const mockResolveTypeReferenceDirective = jest.fn();
    const origResolveTypeReferenceDirective = ts.resolveTypeReferenceDirective;
    ts.resolveTypeReferenceDirective = mockResolveTypeReferenceDirective;

    try {
      mockResolveTypeReferenceDirective.mockReturnValue({
        resolvedTypeReferenceDirective: { resolvedFileName: "resolved.ts" },
      });

      const directives = resolveTypeReferenceDirectives(
        context,
        ["type-ref"],
        "parent-file.ts",
        undefined,
        {},
        undefined
      );
      expect(mockResolveTypeReferenceDirective).toBeCalled();
      expect(directives).toBeArrayOfSize(1);
      expect(directives[0].resolvedFileName).toEqual("resolved.ts");
    } finally {
      ts.resolveTypeReferenceDirective = origResolveTypeReferenceDirective;
    }
  });
});
