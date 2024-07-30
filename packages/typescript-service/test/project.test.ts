import { equal, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { TestContext } from "node:test";
import { afterEach, beforeEach, describe, it } from "node:test";
import ts from "typescript";
import { findConfigFile, readConfigFile } from "../src/config";
import type { DiagnosticWriter } from "../src/diagnostics";
import { Project } from "../src/project";

describe("Project", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");
  const tempDir = fs.realpathSync(os.tmpdir());

  const documentRegistry = ts.createDocumentRegistry();

  let testTempDir: string;

  function createMockDiagnosticWriter(t: TestContext) {
    return { format: t.mock.fn(), print: t.mock.fn() };
  }

  function createProject(
    diagnosticWriter: unknown,
    fileName = "valid-tsconfig.json"
  ): Project {
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

    return new Project(
      documentRegistry,
      diagnosticWriter as DiagnosticWriter,
      cmdLine
    );
  }

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-typescript-service-project-test-")
    );
  });

  afterEach(() => {
    fs.rmSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  it("getConfig() returns the project config", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.getCommandLine());
    equal(typeof project.getCommandLine(), "object");
  });

  it("validateFile() succeeds when given a valid source file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.validateFile(path.join(fixturePath, "a.ts")));
    equal(mockDiagnosticWriter.print.mock.calls.length, 0);
  });

  it("validateFile() fails when given an invalid source file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);
    const result = project.validateFile(path.join(fixturePath, "c.ts"));

    ok(!result);
    equal(mockDiagnosticWriter.print.mock.calls.length, 1);
  });

  it("validate() reports errors from all source files", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(!project.validate());
    equal(mockDiagnosticWriter.print.mock.calls.length, 1);
  });

  it("validate() succeeds after removing a source file with errors", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);
    project.removeFile(path.join(fixturePath, "c.ts"));

    ok(project.validate());
    equal(mockDiagnosticWriter.print.mock.calls.length, 0);
  });

  it("validate() succeeds after replacing a source file with errors", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);
    const snapshot = ts.ScriptSnapshot.fromString(
      "export function c() { return 'c'; }"
    );
    project.setFile(path.join(fixturePath, "c.ts"), snapshot);

    ok(project.validate());
    equal(mockDiagnosticWriter.print.mock.calls.length, 0);
  });

  it("validate() succeeds after removing and re-adding a source file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);
    project.removeFile(path.join(fixturePath, "b.ts"));
    project.removeFile(path.join(fixturePath, "c.ts"));
    project.setFile(path.join(fixturePath, "b.ts"));

    ok(project.validate());
    equal(mockDiagnosticWriter.print.mock.calls.length, 0);
  });

  it("emitFile() successfully writes a transpiled javascript file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.emitFile(path.join(fixturePath, "a.ts")));
    ok(fs.existsSync(path.join(testTempDir, "a.js")));
  });

  it("emitFile() successfully writes a typescript declaration file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.emitFile(path.join(fixturePath, "a.ts")));
    ok(fs.existsSync(path.join(testTempDir, "a.d.ts")));
  });

  it("emitFile() successfully writes a sourcemap file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.emitFile(path.join(fixturePath, "a.ts")));
    ok(fs.existsSync(path.join(testTempDir, "a.js.map")));
  });

  it("emitFile() successfully writes a declaration sourcemap file", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.emitFile(path.join(fixturePath, "a.ts")));
    ok(fs.existsSync(path.join(testTempDir, "a.d.ts.map")));
  });

  it("emit() successfully transpiles all project files", (t) => {
    const mockDiagnosticWriter = createMockDiagnosticWriter(t);
    const project = createProject(mockDiagnosticWriter);

    ok(project.emit());
    ok(fs.existsSync(path.join(testTempDir, "a.js")));
    ok(fs.existsSync(path.join(testTempDir, "b.js")));
    ok(fs.existsSync(path.join(testTempDir, "c.js")));
  });
});
