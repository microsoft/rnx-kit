import "jest-extended";
import path from "path";
import ts from "typescript";
import { DiagnosticWriter } from "../src/diagnostics";
import { ProjectConfig, ProjectConfigLoader } from "../src/config";
import { createResolvers } from "../src/resolve";
import { Project } from "../src/project";

describe("Project", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

  const mockDiagnosticWriter: DiagnosticWriter = {
    format: jest.fn(),
    print: jest.fn(),
  };
  const projectConfigLoader = new ProjectConfigLoader(mockDiagnosticWriter);
  const documentRegistry = ts.createDocumentRegistry();

  afterEach(() => {
    jest.resetAllMocks();
  });

  function createProject(fileName: string = "valid-tsconfig.json"): {
    config: ProjectConfig;
    project: Project;
  } {
    const configFileName = projectConfigLoader.find(fixturePath, fileName);
    const config = projectConfigLoader.load(configFileName);
    const resolvers = createResolvers(config.options);
    const project = new Project(
      documentRegistry,
      mockDiagnosticWriter,
      resolvers,
      config
    );
    return {
      config,
      project,
    };
  }

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
    project.updateFile(path.join(fixturePath, "c.ts"), snapshot);
    expect(project.validate()).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });

  test("validate succeeds after removing and re-adding a source file", () => {
    const { project } = createProject();
    project.removeFile(path.join(fixturePath, "b.ts"));
    project.removeFile(path.join(fixturePath, "c.ts"));

    project.addFile(path.join(fixturePath, "b.ts"));
    expect(project.validate()).toBeTrue();
    expect(mockDiagnosticWriter.print).not.toBeCalled();
  });
});
