import "jest-extended";
import path from "path";
import ts from "typescript";
import { createDiagnosticWriter, DiagnosticWriter } from "../src/diagnostics";
import { ProjectConfigLoader } from "../src/config";
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

  function createProject(
    configFileName: string = "valid-tsconfig.json"
  ): Project {
    const projectConfig = projectConfigLoader.load(fixturePath, configFileName);
    const resolvers = createResolvers(projectConfig.options);
    return new Project(documentRegistry, resolvers, projectConfig);
  }

  test("validateFile succeeds when given a valid source file", () => {
    const project = createProject();
    expect(
      project.validateFile(path.join(fixturePath, "a.ts"))
    ).toBeArrayOfSize(0);
  });

  test("validateFile fails when given an invalid source file", () => {
    const project = createProject();
    expect(
      project.validateFile(path.join(fixturePath, "c.ts"))
    ).toBeArrayOfSize(1);
  });

  test("validate reports errors from all source files", () => {
    const project = createProject();
    expect(project.validate()).toBeArrayOfSize(1);
  });

  test("validate succeeds after removing a source file with errors", () => {
    const project = createProject();
    project.removeFile(path.join(fixturePath, "c.ts"));
    expect(project.validate()).toBeArrayOfSize(0);
  });

  test("validate succeeds after replacing a source file with errors", () => {
    const project = createProject();
    const snapshot = ts.ScriptSnapshot.fromString(
      "export function c() { return 'c'; }"
    );
    project.updateFile(path.join(fixturePath, "c.ts"), snapshot);
    expect(project.validate()).toBeArrayOfSize(0);
  });

  test("validate succeeds after removing and re-adding a source file", () => {
    const project = createProject();
    project.removeFile(path.join(fixturePath, "b.ts"));
    project.removeFile(path.join(fixturePath, "c.ts"));

    project.addFile(path.join(fixturePath, "b.ts"));
    expect(project.validate()).toBeArrayOfSize(0);
  });
});
