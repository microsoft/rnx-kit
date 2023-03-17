jest.mock("../src/resolver");

import type ts from "typescript";
import { createEnhanceLanguageServiceHost } from "../src/host";
import {
  resolveModuleNames,
  resolveTypeReferenceDirectives,
} from "../src/resolver";

//
//  Mechanism to artificially control the TypeScript version. This is used to
//  control how our React Native TS resolver operates -- it doesn't actually
//  downgrade/upgrade TS behavior. While TS does have a few areas where it
//  uses this version at runtime, those shouldn't conflict with the limited
//  testing we are doing here.
//

describe("Host (TS v4.6.0)", () => {
  // Force TS version to 4.6, which pre-dates moduleSuffixes. This ensures our
  // tests run against our internal resolver.
  const tsMock = { version: "4.6.4" } as unknown as typeof ts;

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set for resolver functions", () => {
    const host = {
      getCurrentDirectory: process.cwd,
    } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", {}, tsMock)(host);

    expect(typeof host.resolveModuleNames).toBe("function");
    expect(typeof host.resolveTypeReferenceDirectives).toBe("function");
  });
});

describe("Host (TS >= 4.7.0)", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set to the TS-delegating resolver functions", () => {
    const host = {
      getCurrentDirectory: process.cwd,
    } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", {})(host);

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
    createEnhanceLanguageServiceHost("ios", {})(host);

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
