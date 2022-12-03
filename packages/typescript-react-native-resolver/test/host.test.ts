import "jest-extended";
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
import {
  ExtensionsTypeScript,
  ExtensionsJavaScript,
  ExtensionsJSON,
} from "../src/extension";

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
      options: {},
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
    options: {},
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
      realpath: mockRealpath,
    } as unknown as ModuleResolutionHostLike,
    options: {
      traceResolution: true,
      resolveJsonModule: true,
    },
    replaceReactNativePackageName: (x: string) => x + "-replaced",
  } as unknown as ResolverContext;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("resolves each module", () => {
    const resolvedFileName = "/repos/rnx-kit/node_modules/pkg-dir/index.d.ts";
    (resolvePackageModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    const modules = resolveModuleNames(
      context,
      ["pkg-dir", "pkg-up"],
      "/repos/rnx-kit/packages/test-app/src/app.ts",
      undefined
    );
    expect(modules).not.toBeNil();
    expect(modules).toBeArrayOfSize(2);
    expect(modules[0]).not.toBeNil();
    expect(modules[1]).not.toBeNil();

    expect(mockTrace).toBeCalled();
  });

  test("replaces react-native module with react-native-windows when on the Windows platform", () => {
    const resolvedFileName = "/repos/rnx-kit/node_modules/pkg-dir/index.d.ts";
    (resolvePackageModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    resolveModuleNames(
      context,
      ["pkg-dir", "pkg-up"],
      "/repos/rnx-kit/packages/test-app/src/app.ts",
      undefined
    );

    expect(resolvePackageModule).toBeCalledTimes(2);
    const calls = (resolvePackageModule as jest.Mock).mock.calls;
    // 2nd argument: PackageModuleRef
    expect(calls[0][1]).toEqual({ name: "pkg-dir-replaced" });
    expect(calls[1][1]).toEqual({ name: "pkg-up-replaced" });

    expect(mockTrace).toBeCalled();
  });

  test("tries TypeScript, then JavaScript, then JSON module resolution", () => {
    resolveModuleNames(
      context,
      ["pkg-dir"],
      "/repos/rnx-kit/packages/test-app/src/app.ts",
      undefined
    );

    expect(resolvePackageModule).toBeCalledTimes(3);
    const calls = (resolvePackageModule as jest.Mock).mock.calls;
    // 4th argument: ts.Extension[]
    expect(calls[0][3]).toEqual(ExtensionsTypeScript);
    expect(calls[1][3]).toEqual(ExtensionsJavaScript);
    expect(calls[2][3]).toEqual(ExtensionsJSON);

    expect(mockTrace).toBeCalled();
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

    const context = {
      options: {},
    } as unknown as ResolverContext;

    const directives = resolveTypeReferenceDirectives(
      context,
      ["type-ref"],
      "parent-file.ts"
    );
    expect(mockResolveTypeReferenceDirective).toBeCalled();
    expect(directives).toBeArrayOfSize(1);
    expect(directives[0].resolvedFileName).toEqual("resolved.ts");

    ts.resolveTypeReferenceDirective = origResolveTypeReferenceDirective;
  });
});
