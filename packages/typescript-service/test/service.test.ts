import "jest-extended";
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
  beforeEach(() => {
    diagnostic.createDiagnosticWriter.mockReturnValue(mockDiagnosticWriter);
  });

  afterEach(() => {
    jest.resetAllMocks();
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
