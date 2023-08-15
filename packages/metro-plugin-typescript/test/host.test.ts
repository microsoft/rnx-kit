jest.mock("../src/resolver");

import type ts from "typescript";
import { createEnhanceLanguageServiceHost } from "../src/host";
import {
  resolveModuleNameLiterals,
  resolveModuleNames,
  resolveTypeReferenceDirectiveReferences,
  resolveTypeReferenceDirectives,
} from "../src/resolver";

//
//  Mechanism to artificially control the TypeScript version. This is used to
//  control how our React Native TS resolver operates -- it doesn't actually
//  downgrade/upgrade TS behavior. While TS does have a few areas where it
//  uses this version at runtime, those shouldn't conflict with the limited
//  testing we are doing here.
//

describe("Host (TypeScript <4.7)", () => {
  // Force TypeScript version to 4.6, which pre-dates `moduleSuffixes`.
  const tsMock = { version: "4.6.4" } as unknown as typeof ts;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("throws if TypeScript doesn't support `moduleSuffixes`", () => {
    const host = { getCurrentDirectory: process.cwd } as ts.LanguageServiceHost;
    expect(() => createEnhanceLanguageServiceHost("ios", tsMock)(host)).toThrow(
      "TypeScript >=4.7 is required"
    );
  });
});

describe("Host (TypeScript >=4.7 <5.0)", () => {
  // Force TypeScript version to 4.7, which supports `moduleSuffixes`.
  const tsMock = { version: "4.7.0" } as unknown as typeof ts;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set to the TS-delegating resolver functions", () => {
    const host = { getCurrentDirectory: process.cwd } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", tsMock)(host);

    host.resolveModuleNames?.(
      ["module"],
      "containing-file",
      undefined,
      undefined,
      {},
      undefined
    );

    expect(resolveModuleNames).toBeCalledTimes(1);

    host.resolveTypeReferenceDirectives?.(
      ["type-reference"],
      "containing-file",
      undefined,
      {},
      undefined
    );

    expect(resolveTypeReferenceDirectives).toBeCalledTimes(1);
  });

  test("empty extension is added to the end of the platform file extension list", () => {
    const host = { getCurrentDirectory: process.cwd } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", tsMock)(host);

    host.resolveModuleNames?.(
      ["module"],
      "containing-file",
      undefined,
      undefined,
      {},
      undefined
    );

    expect(resolveModuleNames).toBeCalledTimes(1);
    // 1st argument: ResolverContext
    expect((resolveModuleNames as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        platformFileExtensions: [".ios", ".native", ""],
      })
    );
  });
});

describe("Host (TypeScript >=5.0)", () => {
  // Force TypeScript version to 5.0, which deprecates `resolveModuleNames` and
  // `resolveTypeReferenceDirectives`.
  const tsMock = { version: "5.0.0" } as unknown as typeof ts;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set to the TS-delegating resolver functions", () => {
    const host = { getCurrentDirectory: process.cwd } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", tsMock)(host);

    host.resolveModuleNameLiterals?.(
      [{ text: "module" } as ts.StringLiteral],
      "containing-file",
      undefined,
      {},
      {} as ts.SourceFile,
      undefined
    );

    expect(resolveModuleNameLiterals).toBeCalledTimes(1);

    host.resolveTypeReferenceDirectiveReferences?.(
      ["type-reference"],
      "containing-file",
      undefined,
      {},
      {} as ts.SourceFile,
      undefined
    );

    expect(resolveTypeReferenceDirectiveReferences).toBeCalledTimes(1);
  });

  test("empty extension is added to the end of the platform file extension list", () => {
    const host = { getCurrentDirectory: process.cwd } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", tsMock)(host);

    host.resolveModuleNameLiterals?.(
      [{ text: "module" } as ts.StringLiteral],
      "containing-file",
      undefined,
      {},
      {} as ts.SourceFile,
      undefined
    );

    expect(resolveModuleNameLiterals).toBeCalledTimes(1);

    // 1st argument: ResolverContext
    expect((resolveModuleNameLiterals as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        platformFileExtensions: [".ios", ".native", ""],
      })
    );
  });
});
