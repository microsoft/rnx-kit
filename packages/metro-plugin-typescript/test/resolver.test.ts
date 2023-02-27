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
    replaceReactNativePackageName: (x: string) =>
      x.replace(/^@rnx-kit/, "@replaced"),
  };

  test("resolves modules", () => {
    const origTsResolveModuleName = ts.resolveModuleName;
    const mockTsResolveModuleName = jest.fn();
    ts.resolveModuleName = mockTsResolveModuleName;
    try {
      const moduleNames = [
        "pkg-dir",
        "pkg-up",
        "pkg-up/index.js",
        "@rnx-kit/tools-node",
        "@rnx-kit/tools-node/lib/index.js",
        "./index",
      ];

      const resolvedModules = moduleNames.map((name) => {
        const resolvedModule = { resolvedFileName: name };
        mockTsResolveModuleName.mockReturnValueOnce({ resolvedModule });
        return resolvedModule;
      });

      const modules = resolveModuleNames(
        context,
        moduleNames,
        "/repos/rnx-kit/packages/test-app/src/app.ts",
        undefined,
        undefined,
        {},
        undefined
      );

      expect(mockTsResolveModuleName).toHaveBeenCalledTimes(moduleNames.length);
      const calls = mockTsResolveModuleName.mock.calls;
      // 1st param: module name
      expect(calls[0][0]).toEqual("pkg-dir");
      expect(calls[1][0]).toEqual("pkg-up");
      expect(calls[2][0]).toEqual("pkg-up/index.js");
      expect(calls[3][0]).toEqual("@replaced/tools-node");
      expect(calls[4][0]).toEqual("@replaced/tools-node/lib/index.js");
      expect(calls[5][0]).toEqual("./index");
      // 3rd param: CompilerOptions
      expect(calls[0][2]).toEqual({});
      expect(calls[1][2]).toEqual({});
      expect(calls[2][2]).toEqual({ moduleSuffixes: [".ios", ".native", ""] });
      expect(calls[3][2]).toEqual({});
      expect(calls[4][2]).toEqual({ moduleSuffixes: [".ios", ".native", ""] });
      expect(calls[5][2]).toEqual({ moduleSuffixes: [".ios", ".native", ""] });

      expect(Array.isArray(modules)).toBe(true);
      expect(modules).toEqual(resolvedModules);
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
    expect(outputOptions).toEqual({
      moduleSuffixes: [".ios", ".native", ""],
    });
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
    expect(outputOptions).toEqual({
      moduleSuffixes: inputOptions.moduleSuffixes, // output must match input
    });
  });

  test("verifies that moduleSuffixes is valid when it is already present without a platform name", () => {
    // platform is ios, and is set by context.platform. moduleSuffixes must have
    // all of the ios-related extensions, in order, but can have others mixed in.
    const inputOptions = {
      moduleSuffixes: [".lemonheads", ".native", "", ".snickers"],
    };
    const outputOptions = getCompilerOptionsWithReactNativeModuleSuffixes(
      context,
      "module",
      "containing-file",
      inputOptions
    );
    expect(outputOptions).toEqual({
      moduleSuffixes: inputOptions.moduleSuffixes, // output must match input
    });
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
      const calls = mockResolveTypeReferenceDirective.mock.calls;
      // 1st param: name
      expect(calls[0][0]).toEqual("type-ref");
      // 3rd param: CompilerOptions
      expect(calls[0][2]).toEqual({
        moduleSuffixes: [".ios", ".native", ""],
      });

      expect(Array.isArray(directives)).toBe(true);
      expect(directives.length).toBe(1);
      expect(directives?.[0]?.resolvedFileName).toEqual("resolved.ts");
    } finally {
      ts.resolveTypeReferenceDirective = origResolveTypeReferenceDirective;
    }
  });
});
