import "jest-extended";
import ts from "typescript";

import { resolveFileModule, resolvePackageModule } from "../src/resolve";
jest.mock("../src/resolve");

import {
  changeCompilerHostToUseReactNativeResolver,
  resolveModuleName,
  resolveModuleNames,
  resolveTypeReferenceDirectives,
} from "../src/host";
import type { ModuleResolutionHostLike, ResolverContext } from "../src/types";
import { ResolverLog, ResolverLogMode } from "../src/log";

describe("Host > changeCompilerHostToUseReactNativeResolver", () => {
  function testChangeCompilerHost(host: ts.CompilerHost): void {
    changeCompilerHostToUseReactNativeResolver(
      host,
      {}, // compiler options
      "ios",
      ["native"],
      false, // enable RN substitution?
      false, // enable error-tracing?
      undefined // trace file
    );
  }

  test("sets the trace function to ensure trace logging is possible", () => {
    const host = {} as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.trace).toBeFunction();
  });

  test("hooks fileExists with a function that calls the original function", () => {
    const mock = jest.fn();
    const host = {
      fileExists: mock,
    } as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.fileExists).toBeFunction();
    expect(host.fileExists).not.toBe(mock);
    host.fileExists("alpha");
    expect(mock).toBeCalledWith("alpha");
  });

  test("hooks readFile with a function that calls the original function", () => {
    const mock = jest.fn();
    const host = {
      readFile: mock,
    } as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.readFile).toBeFunction();
    expect(host.readFile).not.toBe(mock);
    host.readFile("beta");
    expect(mock).toBeCalledWith("beta");
  });

  test("hooks directoryExists with a function that calls the original function", () => {
    const mock = jest.fn();
    const host = {
      directoryExists: mock,
    } as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.directoryExists).toBeFunction();
    expect(host.directoryExists).not.toBe(mock);
    host.directoryExists("gamma");
    expect(mock).toBeCalledWith("gamma");
  });

  test("hooks realpath with a function that calls the original function", () => {
    const mock = jest.fn();
    const host = {
      realpath: mock,
    } as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.realpath).toBeFunction();
    expect(host.realpath).not.toBe(mock);
    host.realpath("delta");
    expect(mock).toBeCalledWith("delta");
  });

  test("hooks getDirectories with a function that calls the original function", () => {
    const mock = jest.fn();
    const host = {
      getDirectories: mock,
    } as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.getDirectories).toBeFunction();
    expect(host.getDirectories).not.toBe(mock);
    host.getDirectories("epsilon");
    expect(mock).toBeCalledWith("epsilon");
  });

  test("sets resolveModuleNames", () => {
    const host = {} as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
    expect(host.resolveModuleNames).toBeFunction();
  });

  test("sets resolveTypeReferenceDirectives", () => {
    const host = {} as unknown as ts.CompilerHost;
    testChangeCompilerHost(host);
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
  const mockRealpath = jest.fn();
  const context = {
    host: {
      realpath: mockRealpath,
    } as unknown as ModuleResolutionHostLike,
    options: {},
    log: new ResolverLog(ResolverLogMode.Never),
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
      []
    );
    expect(modules).not.toBeNil();
    expect(modules).toBeArrayOfSize(2);
    expect(modules[0]).not.toBeNil();
    expect(modules[1]).not.toBeNil();
  });

  test("replaces react-native module with react-native-windows when on the Windows platform", () => {
    const resolvedFileName = "/repos/rnx-kit/node_modules/pkg-dir/index.d.ts";
    (resolvePackageModule as jest.Mock).mockReturnValue({ resolvedFileName });
    mockRealpath.mockReturnValue(resolvedFileName);

    resolveModuleNames(
      context,
      ["pkg-dir", "pkg-up"],
      "/repos/rnx-kit/packages/test-app/src/app.ts",
      []
    );

    expect(resolvePackageModule).toBeCalledTimes(2);
    const calls = (resolvePackageModule as jest.Mock).mock.calls;
    // 2nd argument: PackageModuleRef
    expect(calls[0][1]).toEqual({ name: "pkg-dir-replaced" });
    expect(calls[1][1]).toEqual({ name: "pkg-up-replaced" });
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
      log: new ResolverLog(ResolverLogMode.Never),
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
