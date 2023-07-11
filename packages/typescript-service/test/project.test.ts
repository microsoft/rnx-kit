import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import ts from "typescript";
import { findConfigFile, readConfigFile } from "../src/config";
import type { DiagnosticWriter } from "../src/diagnostics";
import { Project } from "../src/project";

describe("Project", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
  const tempDir = fs.realpathSync(os.tmpdir());

  const mockDiagnosticWriter: DiagnosticWriter = {
    format: jest.fn(),
    print: jest.fn(),
  };
  const documentRegistry = ts.createDocumentRegistry();

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-typescript-service-project-test-")
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    fs.rmSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  function createProject(fileName = "valid-tsconfig.json"): Project {
    const configFileName = findConfigFile(fixturePath, fileName);
    if (!configFileName) {
      fail();
    }

    const cmdLine = readConfigFile(configFileName);
    if (!cmdLine) {
      fail();
    }

    cmdLine.options.outDir = testTempDir;
    cmdLine.options.sourceMap = true;
    cmdLine.options.declaration = true;
    cmdLine.options.declarationMap = true;
    const project = new Project(
      documentRegistry,
      mockDiagnosticWriter,
      cmdLine
    );
    return project;
  }

  test("getConfig returns the project config", () => {
    const project = createProject();
    expect(project.getCommandLine()).toBeTruthy();
    expect(typeof project.getCommandLine()).toBe("object");
  });

  test("validateFile succeeds when given a valid source file", () => {
    const project = createProject();
    expect(project.validateFile(path.join(fixturePath, "a.ts"))).toBe(true);
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validateFile fails when given an invalid source file", () => {
    const project = createProject();
    const fileName = path.join(fixturePath, "c.ts");
    const result = project.validateFile(fileName);
    expect(result).toBe(false);
    expect(mockDiagnosticWriter.print).toBeCalledTimes(1);
  });

  test("validate reports errors from all source files", () => {
    const project = createProject();
    expect(project.validate()).toBe(false);
    expect(mockDiagnosticWriter.print).toBeCalledTimes(1);
  });

  test("validate succeeds after removing a source file with errors", () => {
    const project = createProject();
    project.removeFile(path.join(fixturePath, "c.ts"));
    expect(project.validate()).toBe(true);
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validate succeeds after replacing a source file with errors", () => {
    const project = createProject();
    const snapshot = ts.ScriptSnapshot.fromString(
      "export function c() { return 'c'; }"
    );
    project.setFile(path.join(fixturePath, "c.ts"), snapshot);
    expect(project.validate()).toBe(true);
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validate succeeds after removing and re-adding a source file", () => {
    const project = createProject();
    project.removeFile(path.join(fixturePath, "b.ts"));
    project.removeFile(path.join(fixturePath, "c.ts"));

    project.setFile(path.join(fixturePath, "b.ts"));
    expect(project.validate()).toBe(true);
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("emitFile successfully writes a transpiled javascript file", () => {
    const project = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "a.js"))).toBe(true);
  });

  test("emitFile successfully writes a typescript declaration file", () => {
    const project = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "a.d.ts"))).toBe(true);
  });

  test("emitFile successfully writes a sourcemap file", () => {
    const project = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "a.js.map"))).toBe(true);
  });

  test("emitFile successfully writes a declaration sourcemap file", () => {
    const project = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "a.d.ts.map"))).toBe(true);
  });

  test("emit successfully transpiles all project files", () => {
    const project = createProject();
    expect(project.emit()).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "a.js"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "b.js"))).toBe(true);
    expect(fs.existsSync(path.join(testTempDir, "c.js"))).toBe(true);
  });
});
