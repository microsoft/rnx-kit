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
  writeMetroTsConfigToNodeModules,
  runTypeScriptCompiler,
  visit,
  TypeScriptValidation,
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

const rootPathPosix = "/repos/yoyodyne/packages/overthruster";
const rootPathWin32 = path.win32.normalize("C:" + rootPathPosix);

const graphPosix: Graph = {
  dependencies: new Map<string, Module<MixedOutput>>(),
  importBundleNames: new Set(),
  entryPoints: [rootPathPosix + "/src/main.ts"],
};
const graphWin32: Graph = {
  dependencies: new Map<string, Module<MixedOutput>>(),
  importBundleNames: new Set(),
  entryPoints: [rootPathWin32 + "\\src\\main.ts"],
};

function addGraphDependency(g: Graph, modulePath: string) {
  g.dependencies.set(modulePath, {
    dependencies: new Map<string, Dependency>(),
    inverseDependencies: new Set<string>(),
    output: [],
    path: modulePath,
    getSource: () => {
      return null;
    },
  });
  return g.dependencies.get(modulePath);
}

function addModuleDependency(
  g: Graph,
  parent,
  moduleName: string,
  modulePath: string
) {
  parent.dependencies.set(moduleName, {
    absolutePath: modulePath,
  });

  return addGraphDependency(g, modulePath);
}

const index_ts_posix = addGraphDependency(
  graphPosix,
  rootPathPosix + "/src/main.ts"
);
const index_ts_win32 = addGraphDependency(
  graphWin32,
  rootPathWin32 + "\\src\\main.ts"
);

const propulsion_ts_posix = addModuleDependency(
  graphPosix,
  index_ts_posix,
  "./src/propulsion.ts",
  rootPathPosix + "/src/propulsion.ts"
);
const propulsion_ts_win32 = addModuleDependency(
  graphWin32,
  index_ts_win32,
  ".\\src\\propulsion.ts",
  rootPathWin32 + "\\src\\propulsion.ts"
);

const dimensions_ts_posix = addModuleDependency(
  graphPosix,
  index_ts_posix,
  "./src/dimensions.ts",
  rootPathPosix + "/src/dimensions.ts"
);
const dimensions_ts_win32 = addModuleDependency(
  graphWin32,
  index_ts_win32,
  ".\\src\\dimensions.ts",
  rootPathWin32 + "\\src\\dimensions.ts"
);

const lectroid_js_posix = addModuleDependency(
  graphPosix,
  index_ts_posix,
  "./src/lectroid.js",
  rootPathPosix + "/src/lectroid.js"
);
const lectroid_js_win32 = addModuleDependency(
  graphWin32,
  index_ts_win32,
  ".\\src\\lectroid.js",
  rootPathWin32 + "\\src\\lectroid.js"
);

const react_native_posix = addModuleDependency(
  graphPosix,
  index_ts_posix,
  "react-native",
  "/repos/yoyodyne/node_modules/react-native/index.js"
);
const react_native_win32 = addModuleDependency(
  graphWin32,
  index_ts_win32,
  "react-native",
  "C:\\repos\\yoyodyne\\node_modules\\react-native\\index.js"
);

//  create a circular dependency
propulsion_ts_posix.dependencies.set("./src/dimensions.ts", {
  absolutePath: rootPathPosix + "/src/dimensions.ts",
  data: null,
});
propulsion_ts_win32.dependencies.set(".\\src\\dimensions.ts", {
  absolutePath: rootPathWin32 + "\\src\\dimensions.ts",
  data: null,
});

dimensions_ts_posix.dependencies.set("./src/propulsion.ts", {
  absolutePath: rootPathPosix + "/src/propulsion.ts",
  data: null,
});
dimensions_ts_win32.dependencies.set(".\\src\\propulsion.ts", {
  absolutePath: rootPathPosix + "\\src\\propulsion.ts",
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

describe("writeMetroTsConfigToNodeModules()", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("writes the contents of tsconfig to a temp file in node_modules", () => {
    const projectRoot = "/root/path/here";
    const tsconfig = { a: 123 };

    writeMetroTsConfigToNodeModules(projectRoot, tsconfig);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    expect(fs.writeFileSync).toBeCalledWith(
      expect.stringMatching(/[/\\]node_modules[/\\]tsconfig-metro.json$/),
      '{"a":123}'
    );
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

  test("traverses the entire graph (posix)", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graphPosix.entryPoints.forEach((m) =>
      visit(m, graphPosix, rootPathPosix, visited, files)
    );
    expect(visited).toMatchSnapshot();
  });

  test("traverses the entire graph (win32)", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graphWin32.entryPoints.forEach((m) =>
      visit(m, graphWin32, rootPathWin32, visited, files)
    );
    expect(visited).toMatchSnapshot();
  });

  test("returns a list of files in the current package (posix)", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graphPosix.entryPoints.forEach((m) =>
      visit(m, graphPosix, rootPathPosix, visited, files)
    );
    expect(files).toMatchSnapshot();
  });

  test("returns a list of files in the current package (win32)", () => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graphWin32.entryPoints.forEach((m) =>
      visit(m, graphWin32, rootPathWin32, visited, files)
    );
    expect(files).toMatchSnapshot();
  });
});

describe("TypeScriptValidation()", () => {
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
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.include).toBeFalsy();
    expect(tsconfig?.exclude).toBeFalsy();
    expect(tsconfig?.files).toBeTruthy();
    expect(Array.isArray(tsconfig.files)).toBeTruthy();
    expect(tsconfig.files.length).toBeGreaterThan(0);
  });

  test("includes only ts/tsx files when allowJs and checkJs are off", () => {
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig.files).toMatchSnapshot();
  });

  test("includes ts/tsx and js/jsx files when allowJs and checkJs are on", () => {
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        include: ["src"],
        compilerOptions: {
          allowJs: true,
          checkJs: true,
        },
      })
    );

    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig.files).toMatchSnapshot();
  });

  test("adds noEmit compiler option", () => {
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.compilerOptions?.noEmit).toBeTruthy();
  });

  function testResolutionPlatforms(
    platform: string,
    expectedPlatforms: string[]
  ) {
    yargs.mockReturnValue({
      argv: {
        platform,
      },
    });

    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig?.compilerOptions?.resolutionPlatforms).toEqual(
      expectedPlatforms
    );
  }

  test("adds list of resolution platforms (android)", () =>
    testResolutionPlatforms("android", ["android", "native"]));

  test("adds list of resolution platforms (ios)", () =>
    testResolutionPlatforms("ios", ["ios", "native"]));

  test("adds list of resolution platforms (macos)", () =>
    testResolutionPlatforms("macos", ["macos", "native"]));

  test("adds list of resolution platforms (windows)", () =>
    testResolutionPlatforms("windows", ["windows", "win", "native"]));

  test("adds list of resolution platforms (win32)", () =>
    testResolutionPlatforms("win32", ["win32", "win", "native"]));

  test("adds list of resolution platforms (win)", () =>
    testResolutionPlatforms("win", ["win", "native"]));

  test("adds list of resolution platforms (FaKe-PLAtfORm)", () =>
    testResolutionPlatforms("FaKe-PLAtfORm", ["fake-platform", "native"]));

  test("runs typescript compiler", () => {
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
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

  test("preserves extends prop when it refers to a package", () => {
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        include: ["src"],
        extends: "react-native/tsconfig.json",
      })
    );

    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig.extends).toEqual("react-native/tsconfig.json");
  });

  test("preserves extends prop when it is an absolute path", () => {
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        include: ["src"],
        extends: "/Users/lithgow/repos/react-native/tsconfig.json",
      })
    );

    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig.extends).toEqual(
      "/Users/lithgow/repos/react-native/tsconfig.json"
    );
  });

  test("re-relativizes extends prop when it is a relative path", () => {
    fs.readFileSync.mockReturnValue(
      JSON.stringify({
        include: ["src"],
        extends: "../../tsconfig.json",
      })
    );

    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.writeFileSync).toBeCalledTimes(1);
    const tsconfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
    expect(tsconfig.extends).toEqual("../../../tsconfig.json");
  });

  test("runs typescript compiler", () => {
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
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
    TypeScriptValidation()(undefined, undefined, graphPosix, {
      projectRoot: rootPathPosix,
    } as SerializerOptions);

    expect(fs.unlinkSync).toBeCalledTimes(1);
    expect(fs.unlinkSync).toBeCalledWith(
      expect.stringMatching(/[/\\]node_modules[/\\]tsconfig-metro.json$/)
    );
  });

  test("cleans up temporary tsconfig file when typescript compiler fails", () => {
    child_process.spawnSync.mockReturnValue({
      status: 1,
    });

    expect(() => {
      TypeScriptValidation()(undefined, undefined, graphPosix, {
        projectRoot: rootPathPosix,
      } as SerializerOptions);
    }).toThrowError();
  });
});
