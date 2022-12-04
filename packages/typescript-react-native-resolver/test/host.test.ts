import "jest-extended";
import semverSatisfies from "semver/functions/satisfies";
import ts from "typescript";

import { resolveFileModule, resolvePackageModule } from "../src/resolve";
jest.mock("../src/resolve");

import {
  changeHostToUseReactNativeResolver,
  resolveModuleName,
  resolveModuleNames,
  resolveTypeReferenceDirectives,
} from "../src/host";
import type { ModuleResolutionHostLike, ResolverContext } from "../src/types";

describe("Host > changeHostToUseReactNativeResolver", () => {
  const mockGetCurrentDirectory = jest.fn();

  afterEach(() => {
    jest.resetAllMocks();
  });

  function createTestHost(): ts.CompilerHost {
    const host = {
      getCurrentDirectory: mockGetCurrentDirectory,
    } as unknown as ts.CompilerHost;

    changeHostToUseReactNativeResolver({
      host,
      platform: "ios",
      platformExtensionNames: ["native"],
      disableReactNativePackageSubstitution: false,
    });

    return host;
  }

  test("sets resolveModuleNames", () => {
    const host = createTestHost();
    expect(host.resolveModuleNames).toBeFunction();
  });

  test("sets resolveTypeReferenceDirectives", () => {
    const host = createTestHost();
    expect(host.resolveTypeReferenceDirectives).toBeFunction();
  });
});

describe("Host > resolveModuleName", () => {
  const mockRealpath = jest.fn();
  const context = {
    host: {
      realpath: mockRealpath,
    } as unknown as ts.CompilerHost,
  } as unknown as ResolverContext;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("resolves a package module", () => {
    const resolvedFileName =
      "/repos/rnx-kit/node_modules/@scope/package/main.d.ts";
    (resolvePackageModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    const module = resolveModuleName(
      context,
      "@scope/package",
      "/repos/rnx-kit/packages/test-app/lib/app.js",
      {},
      []
    );
    expect(module.isExternalLibraryImport).toBeTrue();
    expect(module.resolvedFileName).toEqual(resolvedFileName);
  });

  test("resolves a file module in the current package", () => {
    const resolvedFileName = "/repos/rnx-kit/packages/test-app/lib/config.d.ts";
    (resolveFileModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    const module = resolveModuleName(
      context,
      "./config",
      "/repos/rnx-kit/packages/test-app/lib/app.js",
      {},
      []
    );
    expect(module.isExternalLibraryImport).toBeFalse();
    expect(module.resolvedFileName).toEqual(resolvedFileName);
  });

  test("resolves a file module in an external package", () => {
    const resolvedFileName =
      "/repos/rnx-kit/node_modules/@scope/package/param.d.ts";
    (resolveFileModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    const module = resolveModuleName(
      context,
      "./param",
      "/repos/rnx-kit/node_modules/@scope/package/index.d.ts",
      {},
      []
    );
    expect(module.isExternalLibraryImport).toBeTrue();
    expect(module.resolvedFileName).toEqual(resolvedFileName);
  });

  test("returns the real path to a resolved file", () => {
    const resolvedFileName = "/repos/rnx-kit/node_modules/find-up/index.js";
    (resolvePackageModule as jest.Mock).mockReturnValue({ resolvedFileName });
    const realResolvedFileName = "/repos/rnx-kit/.yarn-cache/find-up/index.js";
    mockRealpath.mockReturnValue(realResolvedFileName);

    const module = resolveModuleName(
      context,
      "find-up",
      "/repos/rnx-kit/packages/tools-node/src/fs.ts",
      {},
      []
    );
    expect(module.isExternalLibraryImport).toBeTrue();
    expect(module.resolvedFileName).toEqual(realResolvedFileName);
  });
});

describe("Host > resolveModuleNames", () => {
  const mockTrace = jest.fn();
  const mockRealpath = jest.fn();
  const context = {
    host: {
      trace: mockTrace,
    } as unknown as ModuleResolutionHostLike,
    platformExtensions: [".ios", ".native", ""],
    replaceReactNativePackageName: (x: string) => x + "-replaced",
  } as unknown as ResolverContext;
  const options: ts.CompilerOptions = {
    traceResolution: true,
    resolveJsonModule: true,
  };

  beforeAll(() => {
    // We use TS >= 4.7 in our repo. This ensures that the version is proplery restored.
    // These tests will run using the TS resolved with moduleSuffixes, and will bypass
    // our own internal resolver.
    expect(semverSatisfies(ts.version, ">=4.7.0")).toBeTrue();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("resolves each module", () => {
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
        options,
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

      expect(mockTrace).toBeCalled();
    } finally {
      ts.resolveModuleName = origTsResolveModuleName;
    }
  });
});

describe("Host > resolveTypeReferenceDirectives", () => {
  test("delegates to TypeScript", () => {
    const mockResolveTypeReferenceDirective = jest.fn();
    mockResolveTypeReferenceDirective.mockReturnValue({
      resolvedTypeReferenceDirective: { resolvedFileName: "resolved.ts" },
    });
    const origResolveTypeReferenceDirective = ts.resolveTypeReferenceDirective;
    ts.resolveTypeReferenceDirective = mockResolveTypeReferenceDirective;

    const context = {} as unknown as ResolverContext;

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

    ts.resolveTypeReferenceDirective = origResolveTypeReferenceDirective;
  });
});
