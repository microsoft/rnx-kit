import "jest-extended";
import fs from "fs";
import path from "path";
import tempDir from "temp-dir";
import ts from "typescript";
import { DiagnosticWriter } from "../src/diagnostics";
import { ProjectConfig, ProjectConfigLoader } from "../src/config";
import { createDefaultResolverHost } from "../src/resolve";
import { Project } from "../src/project";

describe("Project", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

  const mockDiagnosticWriter: DiagnosticWriter = {
    format: jest.fn(),
    print: jest.fn(),
  };
  const projectConfigLoader = new ProjectConfigLoader(mockDiagnosticWriter);
  const documentRegistry = ts.createDocumentRegistry();

  let testTempDir: string;

  beforeEach(() => {
    testTempDir = fs.mkdtempSync(
      path.join(tempDir, "rnx-kit-typescript-service-project-test-")
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    fs.rmdirSync(testTempDir, { maxRetries: 5, recursive: true });
  });

  function createProject(fileName = "valid-tsconfig.json"): {
    config: ProjectConfig;
    project: Project;
  } {
    const configFileName = projectConfigLoader.find(fixturePath, fileName);
    const config = projectConfigLoader.load(configFileName);
    config.options.outDir = testTempDir;
    config.options.sourceMap = true;
    config.options.declaration = true;
    config.options.declarationMap = true;
    const resolverHost = createDefaultResolverHost(config.options);
    const project = new Project(
      documentRegistry,
      mockDiagnosticWriter,
      resolverHost,
      config
    );
    return {
      config,
      project,
    };
  }

  test("getResolverHost returns an object", () => {
    const { config, project } = createProject();
    const resolverHost = project.getResolverHost();
    expect(resolverHost).not.toBeNil();
    expect(resolverHost).toBeObject();
  });

  test("getConfig returns the project config", () => {
    const { config, project } = createProject();
    expect(project.getConfig()).toBe(config);
  });

  test("validateFile succeeds when given a valid source file", () => {
    const { project } = createProject();
    expect(project.validateFile(path.join(fixturePath, "a.ts"))).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validateFile fails when given an invalid source file", () => {
    const { project } = createProject();
    expect(project.validateFile(path.join(fixturePath, "c.ts"))).toBeFalse();
    expect(mockDiagnosticWriter.print).toBeCalledWith(
      expect.toBeArrayOfSize(1)
    );
  });

  test("validate reports errors from all source files", () => {
    const { project } = createProject();
    expect(project.validate()).toBeFalse();
    expect(mockDiagnosticWriter.print).toBeCalledWith(
      expect.toBeArrayOfSize(1)
    );
  });

  test("validate succeeds after removing a source file with errors", () => {
    const { project } = createProject();
    project.removeFile(path.join(fixturePath, "c.ts"));
    expect(project.validate()).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validate succeeds after replacing a source file with errors", () => {
    const { project } = createProject();
    const snapshot = ts.ScriptSnapshot.fromString(
      "export function c() { return 'c'; }"
    );
    project.setFile(path.join(fixturePath, "c.ts"), snapshot);
    expect(project.validate()).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validate succeeds after removing and re-adding a source file", () => {
    const { project } = createProject();
    project.removeFile(path.join(fixturePath, "b.ts"));
    project.removeFile(path.join(fixturePath, "c.ts"));

    project.setFile(path.join(fixturePath, "b.ts"));
    expect(project.validate()).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("emitFile successfully writes a transpiled javascript file", () => {
    const { project } = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "a.js"))).toBeTrue();
  });

  test("emitFile successfully writes a typescript declaration file", () => {
    const { project } = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "a.d.ts"))).toBeTrue();
  });

  test("emitFile successfully writes a sourcemap file", () => {
    const { project } = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "a.js.map"))).toBeTrue();
  });

  test("emitFile successfully writes a declaration sourcemap file", () => {
    const { project } = createProject();
    expect(project.emitFile(path.join(fixturePath, "a.ts"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "a.d.ts.map"))).toBeTrue();
  });

  test("emit successfully transpiles all project files", () => {
    const { project } = createProject();
    expect(project.emit()).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "a.js"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "b.js"))).toBeTrue();
    expect(fs.existsSync(path.join(testTempDir, "c.js"))).toBeTrue();
  });
});
