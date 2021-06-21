import "jest-extended";
import path from "path";
import ts from "typescript";
import { DiagnosticWriter } from "../src/diagnostics";
import { ProjectConfigLoader } from "../src/config";

describe("ProjectConfigLoader", () => {
  const writer: DiagnosticWriter = {
    format: jest.fn(),
    print: jest.fn(),
  };

  const fixturePath = path.join(process.cwd(), "test", "__fixtures__");

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("find returns undefined when it can't find a config file", () => {
    const loader = new ProjectConfigLoader(writer);
    expect(
      loader.find(fixturePath, "invalid-config-file-name")
    ).toBeUndefined();
  });

  test("find returns the absolute path to the config file", () => {
    const loader = new ProjectConfigLoader(writer);
    const configFileName = loader.find(fixturePath, "valid-tsconfig.json");
    expect(configFileName).toBeString();
    expect(configFileName).not.toBeEmpty();
  });

  test("load throws when it encounters an invalid config file", () => {
    const loader = new ProjectConfigLoader(writer);
    const configFileName = loader.find(fixturePath, "invalid-tsconfig.json");
    expect(() => loader.load(configFileName)).toThrowErrorMatchingSnapshot();
  });

  test("load prints at least one diagnostic when it encounters an invalid config file", () => {
    const loader = new ProjectConfigLoader(writer);
    const configFileName = loader.find(fixturePath, "invalid-tsconfig.json");
    try {
      loader.load(configFileName);
    } catch {}
    // @ts-ignore
    expect(writer.print.mock.calls.length).toBeGreaterThan(0);
  });

  test("load returns a valid config", () => {
    const loader = new ProjectConfigLoader(writer);
    const configFileName = loader.find(fixturePath, "valid-tsconfig.json");
    const config = loader.load(configFileName);
    expect(config.options.target).toEqual(ts.ScriptTarget.ES2015);
    expect(config.options.module).toEqual(ts.ModuleKind.CommonJS);
  });
});
