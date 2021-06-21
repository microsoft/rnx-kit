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

  test("load throws when it can't find a config file", () => {
    const loader = new ProjectConfigLoader(writer);
    expect(() =>
      loader.load(fixturePath, "invalid-config-file-name")
    ).toThrowErrorMatchingSnapshot();
  });

  test("load throws when it encounters an invalid config file", () => {
    const loader = new ProjectConfigLoader(writer);
    expect(() =>
      loader.load(fixturePath, "invalid-tsconfig.json")
    ).toThrowErrorMatchingSnapshot();
  });

  test("load prints at least one diagnostic when it encounters an invalid config file", () => {
    const loader = new ProjectConfigLoader(writer);
    try {
      loader.load(fixturePath, "invalid-tsconfig.json");
    } catch {}
    // @ts-ignore
    expect(writer.print.mock.calls.length).toBeGreaterThan(0);
  });

  test("load returns a valid config", () => {
    const loader = new ProjectConfigLoader(writer);
    const config = loader.load(fixturePath, "valid-tsconfig.json");
    expect(config.options.target).toEqual(ts.ScriptTarget.ES2015);
    expect(config.options.module).toEqual(ts.ModuleKind.CommonJS);
  });
});
