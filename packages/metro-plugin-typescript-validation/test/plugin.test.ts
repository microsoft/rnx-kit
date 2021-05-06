import type {
  Dependency,
  Graph,
  Module,
  MixedOutput,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";
import {
  getModuleRoot,
  readTsConfig,
  writeMetroTsConfig,
  runTypeScriptCompiler,
  visit,
  TypescriptValidation,
} from "../src/plugin";
import path from "path";
const child_process = require("child_process");
const fs = require("fs");
const yargs = require("yargs/yargs");
import { hideBin } from "yargs/helpers";

jest.mock("child_process");
jest.mock("fs");
jest.mock("yargs/yargs");
jest.mock("yargs/helpers");

//  test data

const rootPath = "/repos/yoyodyne/packages/overthruster";

const graph: Graph = {
  dependencies: new Map<string, Module<MixedOutput>>(),
  importBundleNames: new Set(),
  entryPoints: [rootPath + "/src/main.ts"],
};

function addGraphDependency(modulePath: string) {
  graph.dependencies.set(modulePath, {
    dependencies: new Map<string, Dependency>(),
    inverseDependencies: new Set<string>(),
    output: [],
    path: modulePath,
    getSource: () => {
      return null;
    },
  });
  return graph.dependencies.get(modulePath);
}

function addModuleDependency(parent, moduleName: string, modulePath: string) {
  parent.dependencies.set(moduleName, {
    absolutePath: modulePath,
  });

  return addGraphDependency(modulePath);
}

const index_ts = addGraphDependency(rootPath + "/src/main.ts");
const propulsion_ts = addModuleDependency(
  index_ts,
  "./src/propulsion.ts",
  rootPath + "/src/propulsion.ts"
);
const dimension_ts = addModuleDependency(
  index_ts,
  "./src/dimensions.ts",
  rootPath + "/src/dimensions.ts"
);
const react_native = addModuleDependency(
  index_ts,
  "react-native",
  "/repos/yoyodyne/node_modules/react-native/index.js"
);

//  create a circular dependency
propulsion_ts.dependencies.set("./src/dimensions.ts", {
  absolutePath: rootPath + "/src/dimensions.ts",
  data: null,
});
dimension_ts.dependencies.set("./src/propulsion.ts", {
  absolutePath: rootPath + "/src/propulsion.ts",
  data: null,
});

//  test suite

describe("getModuleRoot()", () => {
  test("throws on unknown module", () => {
    expect(() => {
      getModuleRoot("not-a-real-module");
    }).toThrowError();
  });

  test("resolves to the root of @msfast/typescript-platform-resolution", () => {
    expect(getModuleRoot("@msfast/typescript-platform-resolution")).toEqual(
      expect.stringMatching(/@msfast[/\\]typescript-platform-resolution$/)
    );
  });
});

describe("readTsConfig()", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("reads the contents of tsconfig.json", () => {
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        compilerOptions: { noEmit: true },
        include: ["src"],
      })
    );

    const p = path.normalize("/path/to/file");
    expect(readTsConfig(p)).toMatchSnapshot();
    expect(fs.readFileSync).toBeCalledTimes(1);
    expect(fs.readFileSync).toBeCalledWith(
      path.join(p, "tsconfig.json"),
      expect.anything()
    );
  });
});

describe("writeMetroTsConfig()", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("writes the contents of tsconfig to a temp file", () => {
    const projectRoot = "/root/path/here";
    const tsconfig = { a: 123 };

    writeMetroTsConfig(projectRoot, tsconfig);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    expect(fs.writeFileSync).toBeCalledWith(
      expect.stringMatching(/[/\\]tsconfig-metro-[0-9A-Fa-f]{16}.json$/),
      '{"a":123}'
    );
  });

  test("uses different temp file names each time it is called", () => {
    const projectRoot = "/root/path/here";
    const tsconfig = { a: 123 };

    writeMetroTsConfig(projectRoot, tsconfig);
    writeMetroTsConfig(projectRoot, tsconfig);
    writeMetroTsConfig(projectRoot, tsconfig);

    expect(fs.writeFileSync).toBeCalledTimes(3);
    const fileNames = fs.writeFileSync.mock.calls.map((x) => x[0]);
    expect(new Set(fileNames).size === fileNames.length).toBeTruthy();
  });
});

describe("runTypeScriptCompiler()", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("executes the typescript compiler using node.js", () => {
    child_process.spawnSync.mockReturnValue({});

    runTypeScriptCompiler("/path/to/project/tsconfig.json");

    expect(child_process.spawnSync).toBeCalledTimes(1);
    const spawnSyncParams = child_process.spawnSync.mock.calls[0];
    const { [0]: executable, [1]: args } = spawnSyncParams;
    expect(executable).toEqual(process.execPath);
    expect(args[0]).toEqual(
      expect.stringMatching(
        /[/\\]@msfast[/\\]typescript-platform-resolution.*[/\\]tsc.js$/
      )
    );
  });

  test("succeeds when the process exit code is zero", () => {
    child_process.spawnSync.mockReturnValue({
      status: 0,
    });

    runTypeScriptCompiler("/path/to/project/tsconfig.json");
    expect(child_process.spawnSync).toBeCalledTimes(1);
  });

  test("throws when the process exit code is non-zero", () => {
    child_process.spawnSync.mockReturnValue({
      status: 1,
    });

    expect(() =>
      runTypeScriptCompiler("/path/to/project/tsconfig.json")
    ).toThrowErrorMatchingSnapshot();
  });

  test("throws when the process exit code is non-zero and an error is given", () => {
    child_process.spawnSync.mockReturnValue({
      status: 1,
      error: new Error("simulated error message from typescript compiler"),
    });

    expect(() =>
      runTypeScriptCompiler("/path/to/project/tsconfig.json")
    ).toThrowErrorMatchingSnapshot();
  });

  test("throws when the process crashes", () => {
    child_process.spawnSync.mockReturnValue({
      signal: "SIGKILL",
    });

    expect(() =>
      runTypeScriptCompiler("/path/to/project/tsconfig.json")
    ).toThrowErrorMatchingSnapshot();
  });

  test("throws when the process exit code is non-zero and an error is given", () => {
    child_process.spawnSync.mockReturnValue({
      signal: "SIGKILL",
      error: new Error(
        "simulated crash message caused by sending SIGKILL to the typescript compiler"
      ),
    });

    expect(() =>
      runTypeScriptCompiler("/path/to/project/tsconfig.json")
    ).toThrowErrorMatchingSnapshot();
  });
});

describe("visit()", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("traverses the entire graph", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graph.entryPoints.forEach((m) => visit(m, graph, rootPath, visited, files));
    expect(visited).toMatchSnapshot();
  });

  test("returns a list of files in the current package", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graph.entryPoints.forEach((m) => visit(m, graph, rootPath, visited, files));
    expect(files).toMatchSnapshot();
  });
});

describe("TypescriptValidation()", () => {
  beforeEach(() => {
    yargs.mockReturnValue({
      argv: {
        platform: "test-platform",
      },
    });

    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        include: ["src"],
      })
    );

    child_process.spawnSync.mockReturnValue({
      status: 0,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("replaces file specification with list from graph", () => {
    TypescriptValidation()(undefined, undefined, graph, {
      projectRoot: rootPath,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.include).toBeFalsy();
    expect(tsconfig?.exclude).toBeFalsy();
    expect(tsconfig?.files).toBeTruthy();
    expect(Array.isArray(tsconfig.files)).toBeTruthy();
    expect(tsconfig.files.length).toBeGreaterThan(0);
  });

  test("adds noEmit compiler option", () => {
    TypescriptValidation()(undefined, undefined, graph, {
      projectRoot: rootPath,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.compilerOptions?.noEmit).toBeTruthy();
  });

  test("adds list of resolution platforms", () => {
    TypescriptValidation()(undefined, undefined, graph, {
      projectRoot: rootPath,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.compilerOptions?.resolutionPlatforms).toEqual([
      "test-platform",
      "native",
    ]);
  });

  test("runs typescript compiler", () => {
    TypescriptValidation()(undefined, undefined, graph, {
      projectRoot: rootPath,
    } as SerializerOptions);

    expect(child_process.spawnSync).toBeCalledTimes(1);
    const spawnSyncParams = child_process.spawnSync.mock.calls[0];
    const { [1]: args } = spawnSyncParams;
    expect(args[0]).toEqual(
      expect.stringMatching(
        /[/\\]@msfast[/\\]typescript-platform-resolution.*[/\\]tsc.js$/
      )
    );
  });

  test("cleans up temporary tsconfig file when typescript compiler succeeds", () => {
    TypescriptValidation()(undefined, undefined, graph, {
      projectRoot: rootPath,
    } as SerializerOptions);

    expect(fs.unlinkSync).toBeCalledTimes(1);
    expect(fs.unlinkSync).toBeCalledWith(
      expect.stringMatching(/[/\\]tsconfig-metro-[0-9A-Fa-f]{16}.json$/)
    );
  });

  test("cleans up temporary tsconfig file when typescript compiler fails", () => {
    child_process.spawnSync.mockReturnValue({
      status: 1,
    });

    expect(() => {
      TypescriptValidation()(undefined, undefined, graph, {
        projectRoot: rootPath,
      } as SerializerOptions);
    }).toThrowError();
  });
});
