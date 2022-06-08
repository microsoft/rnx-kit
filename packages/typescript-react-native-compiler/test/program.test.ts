import "jest-extended";
import fs from "fs";
import path from "path";
import tempDir from "temp-dir";

import { CommandLine, parseCommandLine } from "../src/command-line";
import { createProgram, createIncrementalProgram } from "../src/program";
import ts from "typescript";

const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

function createTestTempDir(label: string): string {
  return fs.mkdtempSync(
    path.join(
      tempDir,
      `rnx-kit-typescript-react-native-compiler-${label}-test-`
    )
  );
}

function removeTestTempDir(testTempDir: string): void {
  fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
}

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
  const oldLog = console.log;
  const mockLog = jest.fn();
  console.log = mockLog;

  try {
    const emitResult = program.emit();
    expect(emitResult.emitSkipped).toBeFalse();
    expect(emitResult.diagnostics).toBeArrayOfSize(0);

    expect(fs.existsSync(path.join(testTempDir, "index.ios.js"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "f.ios.js"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "f.native.js"))).toBeFalse();

    expect(mockLog).toHaveBeenCalledTimes(0);
  } finally {
    console.log = oldLog;
  }
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

describe("Program > createProgram", () => {
  let testTempDir: string;

  beforeEach(() => {
    testTempDir = createTestTempDir("createProgram");
  });

  afterEach(() => {
    removeTestTempDir(testTempDir);
  });

  function getProgram(usePackage: UsePackage): ts.Program {
    return createProgram(getCommandLine(testTempDir, usePackage, Build.Full));
  }

  test("creates a program with the given set of root files", () => {
    const program = getProgram(UsePackage.TS);
    expect(program.getRootFileNames()).toIncludeSameMembers([
      path.join(fixturePath, "ts", "index.ts"),
    ]);
  });

  test("creates a program with the given options", () => {
    testProgramOptions(testTempDir, getProgram(UsePackage.TS));
  });

  test("creates a program with the given set of project references", () => {
    const cmdLine = getCommandLine(testTempDir, UsePackage.TS, Build.Full);
    cmdLine.ts.projectReferences = [{ path: "/foo/bar.ts" }];
    const program = createProgram(cmdLine);
    expect(program.getProjectReferences()).toIncludeSameMembers([
      { path: "/foo/bar.ts" },
    ]);
  });

  test("creates a program with the react-native resolver when a platform is specified", () => {
    testProgramUsesReactNativeResolver(testTempDir, getProgram(UsePackage.RN));
  });

  test("creates a program with the typescript resolver when no platform is specified", () => {
    testProgramUsesTypeScriptResolver(testTempDir, getProgram(UsePackage.TS));
  });
});

describe("Program > createIncrementalProgram", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = createTestTempDir("createIncrementalProgram");
  });

  afterEach(() => {
    removeTestTempDir(testTempDir);
  });

  function getProgram(
    usePackage: UsePackage
  ): ts.EmitAndSemanticDiagnosticsBuilderProgram {
    return createIncrementalProgram(
      getCommandLine(testTempDir, usePackage, Build.Incremental)
    );
  }

  test("creates a program with the given set of root files", () => {
    const program = getProgram(UsePackage.TS);
    expect(program.getProgram().getRootFileNames()).toIncludeSameMembers([
      path.join(fixturePath, "ts", "index.ts"),
    ]);
  });

  test("creates a program with the given options", () => {
    testProgramOptions(testTempDir, getProgram(UsePackage.TS));
  });

  test("creates a program with the given set of project references", () => {
    const cmdLine = getCommandLine(
      testTempDir,
      UsePackage.TS,
      Build.Incremental
    );
    cmdLine.ts.projectReferences = [{ path: "/foo/bar.ts" }];
    const program = createIncrementalProgram(cmdLine);
    expect(program.getProgram().getProjectReferences()).toIncludeSameMembers([
      { path: "/foo/bar.ts" },
    ]);
  });

  test("creates a program with the react-native resolver when a platform is specified", () => {
    testProgramUsesReactNativeResolver(testTempDir, getProgram(UsePackage.RN));
  });

  test("creates a program with the typescript resolver when no platform is specified", () => {
    testProgramUsesTypeScriptResolver(testTempDir, getProgram(UsePackage.TS));
  });
});
