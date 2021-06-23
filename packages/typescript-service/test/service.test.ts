import path from "path";
import mockConsole from "jest-mock-console";
import { Service } from "../src/service";
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

  test("openProject fails when the config file does not exist", () => {
    const service = new Service();

    const restoreConsole = mockConsole();
    expect(service.openProject(fixturePath, "does-not-exist")).toBeUndefined();
    expect(console.error).toBeCalledTimes(1);
    restoreConsole();
  });

  test("openProject succeeds when given a valid config file", () => {
    const service = new Service();
    const project = service.openProject(fixturePath, "valid-tsconfig.json");
    expect(project).not.toBeNil();
    expect(project).toBeObject();
  });

  test("openProjectByFile fails when the config file is invalid", () => {
    const service = new Service();
    expect(() =>
      service.openProjectByFile(path.join(fixturePath, "invalid-tsconfig.json"))
    ).toThrowError();
  });

  test("openProjectByFile succeeds", () => {
    const service = new Service();
    const project = service.openProjectByFile(
      path.join(fixturePath, "valid-tsconfig.json")
    );
    expect(project).not.toBeNil();
    expect(project).toBeObject();
  });
});
