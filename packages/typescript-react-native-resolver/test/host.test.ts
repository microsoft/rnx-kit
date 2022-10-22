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
import { ResolverLog, ResolverLogMode } from "../src/log";
import {
  ExtensionsTypeScript,
  ExtensionsJavaScript,
  ExtensionsJSON,
} from "../src/extension";

let origTsVersion: string;
beforeEach(() => {
  origTsVersion = ts.version;
  (ts as any).version = "4.6.0"; // eslint-disable-line @typescript-eslint/no-explicit-any
});

afterEach(() => {
  (ts as any).version = origTsVersion; // eslint-disable-line @typescript-eslint/no-explicit-any
});

describe("Host > changeHostToUseReactNativeResolver", () => {
  const mockDirectoryExists = jest.fn();
  const mockFileExists = jest.fn();
  const mockGetCurrentDirectory = jest.fn();
  const mockGetDirectories = jest.fn();
  const mockReadFile = jest.fn();
  const mockRealpath = jest.fn();
  const host = {
    directoryExists: mockDirectoryExists,
    fileExists: mockFileExists,
    getCurrentDirectory: mockGetCurrentDirectory,
    getDirectories: mockGetDirectories,
    readFile: mockReadFile,
    realpath: mockRealpath,
  } as unknown as ts.CompilerHost;

  afterEach(() => {
    jest.resetAllMocks();
  });

  function testChangeHost(): void {
    changeHostToUseReactNativeResolver({
      host,
      options: {},
      platform: "ios",
      platformExtensionNames: ["native"],
      disableReactNativePackageSubstitution: false,
      traceReactNativeModuleResolutionErrors: true,
      traceResolutionLog: undefined,
    });
  }

  test("sets the trace function to ensure trace logging is possible", () => {
    testChangeHost();
    expect(host.trace).toBeFunction();
  });

  test("hooks fileExists with a function that calls the original function", () => {
    testChangeHost();
    expect(host.fileExists).toBeFunction();
    expect(host.fileExists).not.toBe(mockFileExists);
    host.fileExists("alpha");
    expect(mockFileExists).toBeCalledWith("alpha");
  });

  test("hooks readFile with a function that calls the original function", () => {
    testChangeHost();
    expect(host.readFile).toBeFunction();
    expect(host.readFile).not.toBe(mockReadFile);
    host.readFile("beta");
    expect(mockReadFile).toBeCalledWith("beta");
  });

  test("hooks directoryExists with a function that calls the original function", () => {
    testChangeHost();
    expect(host.directoryExists).toBeFunction();
    expect(host.directoryExists).not.toBe(mockDirectoryExists);
    host.directoryExists("gamma");
    expect(mockDirectoryExists).toBeCalledWith("gamma");
  });

  test("hooks realpath with a function that calls the original function", () => {
    testChangeHost();
    expect(host.realpath).toBeFunction();
    expect(host.realpath).not.toBe(mockRealpath);
    host.realpath("delta");
    expect(mockRealpath).toBeCalledWith("delta");
  });

  test("hooks getDirectories with a function that calls the original function", () => {
    testChangeHost();
    expect(host.getDirectories).toBeFunction();
    expect(host.getDirectories).not.toBe(mockGetDirectories);
    host.getDirectories("epsilon");
    expect(mockGetDirectories).toBeCalledWith("epsilon");
  });

  test("sets resolveModuleNames", () => {
    testChangeHost();
    expect(host.resolveModuleNames).toBeFunction();
  });

  test("sets resolveTypeReferenceDirectives", () => {
    testChangeHost();
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
    options: {
      resolveJsonModule: true,
    },
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
      undefined
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
      undefined
    );

    expect(resolvePackageModule).toBeCalledTimes(2);
    const calls = (resolvePackageModule as jest.Mock).mock.calls;
    // 2nd argument: PackageModuleRef
    expect(calls[0][1]).toEqual({ name: "pkg-dir-replaced" });
    expect(calls[1][1]).toEqual({ name: "pkg-up-replaced" });
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

describe("Host-TS-4.7 > resolveModuleName", () => {

 beforeEach(() => {
    (ts as any).version = "4.7.0"; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

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
