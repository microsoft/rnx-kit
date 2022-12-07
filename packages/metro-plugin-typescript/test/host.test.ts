import "jest-extended";
import semverSatisfies from "semver/functions/satisfies";
import ts from "typescript";

import { createEnhanceLanguageServiceHost } from "../src/host";
import {
  resolveModuleNames,
  resolveTypeReferenceDirectives,
} from "../src/resolver";

jest.mock("../src/resolver");

//
//  Mechanism to artificially control the TypeScript version. This is used to
//  control how our React Native TS resolver operates -- it doesn't actually
//  downgrade/upgrade TS behavior. While TS does have a few areas where it
//  uses this version at runtime, those shouldn't conflict with the limited
//  testing we are doing here.
//

const origTsVersion = ts.version;

function setTsVersion(version: string) {
  (ts as any).version = version; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function resetTsVersion() {
  (ts as any).version = origTsVersion; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe("Host (TS v4.6.0)", () => {
  beforeAll(() => {
    // Force TS version to 4.6.0, which pre-dates moduleSuffixes. This ensures our tests
    // run against our internal resolver.
    setTsVersion("4.6.0");
  });

  afterAll(() => {
    resetTsVersion();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set for resolver functions", () => {
    const host = {
      getCurrentDirectory: process.cwd,
    } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", {})(host);

    expect(host.resolveModuleNames).toBeFunction();
    expect(host.resolveTypeReferenceDirectives).toBeFunction();
  });
});

describe("Host (TS >= 4.7.0)", () => {
  beforeAll(() => {
    // We use TS >= 4.7 in our repo. This ensures that the version is proplery restored.
    // These tests will run using the TS resolver with moduleSuffixes, and will bypass
    // our own internal resolver.
    expect(semverSatisfies(ts.version, ">=4.7.0")).toBeTrue();
  });

  afterAll(() => {
    resetTsVersion();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("hooks are set to the TS-delegating resolver functions", () => {
    const host = {
      getCurrentDirectory: process.cwd,
    } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", {})(host);

    expect(host.resolveModuleNames).toBeFunction();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    host.resolveModuleNames!(
      ["module"],
      "containing-file",
      undefined,
      undefined,
      {},
      undefined
    );
    expect(resolveModuleNames).toBeCalledTimes(1);

    expect(host.resolveTypeReferenceDirectives).toBeFunction();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    host.resolveTypeReferenceDirectives!(
      ["type-reference"],
      "containing-file",
      undefined,
      {},
      undefined
    );
    expect(resolveTypeReferenceDirectives).toBeCalledTimes(1);
  });

  test("empty extension is added to the end of the platform file extension list", () => {
    const host = {
      getCurrentDirectory: process.cwd,
    } as ts.LanguageServiceHost;
    createEnhanceLanguageServiceHost("ios", {})(host);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    host.resolveModuleNames!(
      ["module"],
      "containing-file",
      undefined,
      undefined,
      {},
      undefined
    );
    expect(resolveModuleNames).toBeCalledTimes(1);
    // 1st argument: ResolverContext
    expect((resolveModuleNames as jest.Mock).mock.calls[0][0]).toContainEntry([
      "platformFileExtensions",
      [".ios", ".native", ""],
    ]);
  });
});
