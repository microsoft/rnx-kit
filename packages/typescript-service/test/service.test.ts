import path from "path";
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

  test("findProject returns undefined when the config file does not exist", () => {
    const service = new Service();
    expect(service.findProject(fixturePath, "does-not-exist")).toBeUndefined();
  });

  test("findProject succeeds when given the config file exists", () => {
    const service = new Service();
    const configFileName = service.findProject(
      fixturePath,
      "valid-tsconfig.json"
    );
    expect(configFileName).not.toBeNil();
    expect(configFileName).toBeString();
  });

  test("openProject fails when the config file is invalid", () => {
    const service = new Service();
    expect(() =>
      service.openProject(path.join(fixturePath, "invalid-tsconfig.json"))
    ).toThrowError();
  });

  test("openProject succeeds", () => {
    const service = new Service();
    const project = service.openProject(
      path.join(fixturePath, "valid-tsconfig.json")
    );
    expect(project).not.toBeNil();
    expect(project).toBeObject();
  });
});
