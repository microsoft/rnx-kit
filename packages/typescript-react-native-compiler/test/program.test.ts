import "jest-extended";
import fs from "fs";
import path from "path";
import process from "process";
import semverSatisfies from "semver/functions/satisfies";
import { createTestDirectory, removeTestDirectory } from "./utils";

import { CommandLine, parseCommandLine } from "../src/command-line";
import { createProgram, createIncrementalProgram } from "../src/program";
import ts from "typescript";

//
//  Mechanism to artificially control the TypeScript version. This is used to
//  control how our React Native TS resolver operates -- it doesn't actually
//  downgrade/upgrade TS behavior. While TS does have a few areas where it
//  uses this version at runtime, those shouldn't conflict with the limited
//  testing we are doing here.
//
const mockTsWrite = jest.fn();
const origTsWrite = ts.sys.write;

const origTsVersion = ts.version;

function setTsVersion(version: string) {
  (ts as any).version = version; // eslint-disable-line @typescript-eslint/no-explicit-any
}

function resetTsVersion() {
  (ts as any).version = origTsVersion; // eslint-disable-line @typescript-eslint/no-explicit-any
}

//
//  Manage temporay files for tests in this suite.
//

let testTempDir: string;

function createTestTempDir() {
  testTempDir = createTestDirectory(
    `rnx-kit-typescript-react-native-compiler-program-tests-`
  );
}

function removeTestTempDir(): void {
  removeTestDirectory(testTempDir);
  testTempDir = "";
}

//
//  Before/After routines which apply to the entire suite
//

beforeAll(() => {
  ts.sys.write = mockTsWrite;
});

afterAll(() => {
  ts.sys.write = origTsWrite;
  resetTsVersion();
});

beforeEach(() => {
  createTestTempDir();
});

afterEach(() => {
  removeTestTempDir();
  jest.resetAllMocks();
});

//
//  Common test functions, types, and data
//

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

enum UsePackage {
  RN,
  TS,
}

enum Build {
  Full,
  Incremental,
}

function getCommandLine(
  testTempDir: string,
  usePackage: UsePackage,
  build: Build
): CommandLine {
  const cmdLine = parseCommandLine([
    "node",
    "rn-tsc.js",
    ...(usePackage === UsePackage.RN
      ? [
          "--platform",
          "ios",
          "--platformExtensions",
          "native",
          path.join(fixturePath, "rn", "index.ios.ts"),
        ]
      : [path.join(fixturePath, "ts", "index.ts")]),
    "--outDir",
    testTempDir,
    "--declaration",
    "--strict",
    "--skipLibCheck", // saves a lot of time; we don't need them for these tests
    "--noLib", // saves a lot of time; we don't need them for these tests
    "--traceResolution", // always print module resolution tracing to validate that it works
    ...(build === Build.Incremental ? ["--incremental", "--composite"] : []),
  ]);
  return cmdLine;
}

function testProgramOptions(
  testTempDir: string,
  program: ts.Program | ts.EmitAndSemanticDiagnosticsBuilderProgram
): void {
  expect(program.getCompilerOptions().outDir).toEqual(testTempDir);
  expect(program.getCompilerOptions().declaration).toBeTrue();
  expect(program.getCompilerOptions().strict).toBeTrue();
}

function testProgramUsesReactNativeResolver(
  testTempDir: string,
  program: ts.Program | ts.EmitAndSemanticDiagnosticsBuilderProgram
): void {
  const emitResult = program.emit();
  expect(emitResult.emitSkipped).toBeFalse();
  expect(emitResult.diagnostics).toBeArrayOfSize(0);

  expect(fs.existsSync(path.join(testTempDir, "index.ios.js"))).toBeTrue();
  expect(fs.existsSync(path.join(testTempDir, "f.ios.js"))).toBeTrue();
  expect(fs.existsSync(path.join(testTempDir, "f.native.js"))).toBeFalse();
}

function testProgramUsesTypeScriptResolver(
  testTempDir: string,
  program: ts.Program | ts.EmitAndSemanticDiagnosticsBuilderProgram
): void {
  const emitResult = program.emit();
  expect(emitResult.emitSkipped).toBeFalse();
  expect(emitResult.diagnostics).toBeArrayOfSize(0);

  expect(fs.existsSync(path.join(testTempDir, "index.js"))).toBeTrue();
  expect(fs.existsSync(path.join(testTempDir, "f.js"))).toBeTrue();
  expect(fs.existsSync(path.join(testTempDir, "f.native.js"))).toBeFalse();
}

//
//  Tests for createProgram and createIncrementalProgram. They are run
//  against TS < 4.7 and TS >= 4.7.
//

const testCP: Map<string, () => void> = new Map();
const testCIP: Map<string, () => void> = new Map();

function addTest(name: string, fnCP: () => void, fnCIP: () => void) {
  testCP.set(name, fnCP);
  testCIP.set(name, fnCIP);
}
function scheduleTests(tests: Map<string, () => void>) {
  tests.forEach((v, k) => test(k, v));
}

function getProgram(usePackage: UsePackage): ts.Program {
  return createProgram(getCommandLine(testTempDir, usePackage, Build.Full));
}
function getIncrementalProgram(
  usePackage: UsePackage
): ts.EmitAndSemanticDiagnosticsBuilderProgram {
  return createIncrementalProgram(
    getCommandLine(testTempDir, usePackage, Build.Incremental)
  );
}

function testCreateProgramWithRootFiles() {
  const program = getProgram(UsePackage.TS);
  expect(program.getRootFileNames()).toIncludeSameMembers([
    path.join(fixturePath, "ts", "index.ts"),
  ]);
}
function testCreateIncrementalProgramWithRootFiles() {
  const program = getIncrementalProgram(UsePackage.TS);
  expect(program.getProgram().getRootFileNames()).toIncludeSameMembers([
    path.join(fixturePath, "ts", "index.ts"),
  ]);
}
addTest(
  "creates a program with the given set of root files",
  testCreateProgramWithRootFiles,
  testCreateIncrementalProgramWithRootFiles
);

function testCreateProgramWithOptions() {
  testProgramOptions(testTempDir, getProgram(UsePackage.TS));
}
function testCreateIncrementalProgramWithOptions() {
  testProgramOptions(testTempDir, getIncrementalProgram(UsePackage.TS));
}
addTest(
  "creates a program with the given options",
  testCreateProgramWithOptions,
  testCreateIncrementalProgramWithOptions
);

function testCreateProgramWithReferences() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.TS, Build.Full);
  cmdLine.ts.projectReferences = [{ path: "/foo/bar.ts" }];
  const program = createProgram(cmdLine);
  expect(program.getProjectReferences()).toIncludeSameMembers([
    { path: "/foo/bar.ts" },
  ]);
}
function testCreateIncrementalProgramWithReferences() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.TS, Build.Incremental);
  cmdLine.ts.projectReferences = [{ path: "/foo/bar.ts" }];
  const program = createIncrementalProgram(cmdLine);
  expect(program.getProgram().getProjectReferences()).toIncludeSameMembers([
    { path: "/foo/bar.ts" },
  ]);
}
addTest(
  "creates a program with the given set of project references",
  testCreateProgramWithReferences,
  testCreateIncrementalProgramWithReferences
);

function testCreateProgramUsingRNResolver() {
  testProgramUsesReactNativeResolver(testTempDir, getProgram(UsePackage.RN));
  expect(mockTsWrite.mock.calls.length).toBeGreaterThan(0);
  expect(mockTsWrite.mock.calls[0][0]).toMatch(/^======== Resolving module/);
}
function testCreateIncrementalProgramUsingRNResolver() {
  testProgramUsesReactNativeResolver(
    testTempDir,
    getIncrementalProgram(UsePackage.RN)
  );
  expect(mockTsWrite.mock.calls.length).toBeGreaterThan(0);
  expect(mockTsWrite.mock.calls[0][0]).toMatch(/^======== Resolving module/);
}
addTest(
  "creates a program with the react-native resolver when a platform is specified",
  testCreateProgramUsingRNResolver,
  testCreateIncrementalProgramUsingRNResolver
);

function testCreateProgramUsingRNResolveNoTracing() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.RN, Build.Full);
  delete cmdLine.ts.options.traceResolution;
  testProgramUsesReactNativeResolver(testTempDir, createProgram(cmdLine));
  expect(mockTsWrite).not.toBeCalled();
}
function testCreateIncrementalProgramUsingRNResolveNoTracing() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.RN, Build.Incremental);
  delete cmdLine.ts.options.traceResolution;
  testProgramUsesReactNativeResolver(
    testTempDir,
    createIncrementalProgram(cmdLine)
  );
  expect(mockTsWrite).not.toBeCalled();
}
addTest(
  "creates a program with the react-native resolver with tracing disabled",
  testCreateProgramUsingRNResolveNoTracing,
  testCreateIncrementalProgramUsingRNResolveNoTracing
);

function testCreateProgramUsingTSResolver() {
  testProgramUsesTypeScriptResolver(testTempDir, getProgram(UsePackage.TS));
  expect(mockTsWrite.mock.calls.length).toBeGreaterThan(0);
  expect(mockTsWrite.mock.calls[0][0]).toMatch(/^======== Resolving module/);
}
function testCreateIncrementalProgramUsingTSResolver() {
  testProgramUsesTypeScriptResolver(
    testTempDir,
    getIncrementalProgram(UsePackage.TS)
  );
  expect(mockTsWrite.mock.calls.length).toBeGreaterThan(0);
  expect(mockTsWrite.mock.calls[0][0]).toMatch(/^======== Resolving module/);
}
addTest(
  "creates a program with the typescript resolver when no platform is specified",
  testCreateProgramUsingTSResolver,
  testCreateIncrementalProgramUsingTSResolver
);

function testCreateProgramUsingTSResolverNoTracing() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.TS, Build.Full);
  delete cmdLine.ts.options.traceResolution;
  testProgramUsesTypeScriptResolver(testTempDir, createProgram(cmdLine));
  expect(mockTsWrite).not.toBeCalled();
}
function testCreateIncrementalProgramUsingTSResolverNoTracing() {
  const cmdLine = getCommandLine(testTempDir, UsePackage.TS, Build.Incremental);
  delete cmdLine.ts.options.traceResolution;
  testProgramUsesTypeScriptResolver(
    testTempDir,
    createIncrementalProgram(cmdLine)
  );
  expect(mockTsWrite).not.toBeCalled();
}
addTest(
  "creates a program with the typescript resolver with tracing disabled",
  testCreateProgramUsingTSResolverNoTracing,
  testCreateIncrementalProgramUsingTSResolverNoTracing
);

describe("Program > createProgram (TS v4.6.0)", () => {
  beforeAll(() => {
    // Force TS version to 4.6.0, which pre-dates moduleSuffixes. This ensures our tests
    // run against our internal resolver.
    setTsVersion("4.6.0");
  });

  afterAll(() => {
    resetTsVersion();
  });

  scheduleTests(testCP);
});

describe("Program > createProgram (TS >= 4.7.0)", () => {
  beforeAll(() => {
    // We use TS >= 4.7 in our repo. This ensures that the version is proplery restored.
    // These tests will run using the TS resolver with moduleSuffixes, and will bypass
    // our own internal resolver.
    expect(semverSatisfies(ts.version, ">=4.7.0")).toBeTrue();
  });

  scheduleTests(testCP);
});

describe("Program > createIncrementalProgram (TS v4.6.0)", () => {
  beforeAll(() => {
    // Force TS version to 4.6.0, which pre-dates moduleSuffixes. This ensures our tests
    // run against our internal resolver.
    setTsVersion("4.6.0");
  });

  afterAll(() => {
    resetTsVersion();
  });

  scheduleTests(testCIP);
});

describe("Program > createIncrementalProgram (TS >= 4.7.0)", () => {
  beforeAll(() => {
    // We use TS >= 4.7 in our repo. This ensures that the version is proplery restored.
    // These tests will run using the TS resolver with moduleSuffixes, and will bypass
    // our own internal resolver.
    expect(semverSatisfies(ts.version, ">=4.7.0")).toBeTrue();
  });

  scheduleTests(testCIP);
});
