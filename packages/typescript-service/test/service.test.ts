import "jest-extended";
import path from "path";
import ts from "typescript";
import { Service } from "../src/service";
import { createDefaultResolverHost } from "../src/resolve";
const diagnostic = require("../src/diagnostics");

diagnostic.createDiagnosticWriter = jest.fn();
const mockDiagnosticWriter = {
  format: jest.fn(),
  print: jest.fn(),
};

describe("Service", () => {
  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

  beforeEach(() => {
    diagnostic.createDiagnosticWriter.mockReturnValue(mockDiagnosticWriter);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("getProjectConfigLoader() returns a valid object", () => {
    const service = new Service();
    const loader = service.getProjectConfigLoader();
    expect(loader).not.toBeNil();
    expect(loader).toBeObject();
  });

  test("openProject() returns a valid object", () => {
    const service = new Service();
    const config = { fileNames: [] } as ts.ParsedCommandLine;
    const project = service.openProject(
      config,
      createDefaultResolverHost(config.options)
    );
    expect(project).not.toBeNil();
    expect(project).toBeObject();
  });
});
