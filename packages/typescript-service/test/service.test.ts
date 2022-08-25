import "jest-extended";
import ts from "typescript";
import { Service } from "../src/service";
const diagnostic = require("../src/diagnostics");

jest.mock("../src/diagnostics", () => {
  return {
    ...jest.requireActual("../src/diagnostics"),
    createDiagnosticWriter: jest.fn(),
  };
});

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
    const project = service.openProject(config);
    expect(project).not.toBeNil();
    expect(project).toBeObject();
  });
});
