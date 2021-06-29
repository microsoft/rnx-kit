import path from "path";
import type {
  Dependency,
  Graph,
  Module,
  MixedOutput,
  TransformInputOptions,
} from "metro";
import { typescriptSerializerHook } from "../src/plugin";

//  test data

const rootPathPosix = "/repos/yoyodyne/packages/overthruster";
const rootPathWin32 = path.win32.normalize("C:" + rootPathPosix);

const transformOptions: TransformInputOptions = {
  dev: true,
  hot: false,
  minify: false,
  platform: "ios",
  type: "module",
  unstable_transformProfile: "default",
};

const graphPosix: Graph = {
  dependencies: new Map<string, Module<MixedOutput>>(),
  importBundleNames: new Set(),
  entryPoints: [rootPathPosix + "/src/main.ts"],
  transformOptions,
};
const graphWin32: Graph = {
  dependencies: new Map<string, Module<MixedOutput>>(),
  importBundleNames: new Set(),
  entryPoints: [rootPathWin32 + "\\src\\main.ts"],
  transformOptions,
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

describe("typescriptSerializerHook", () => {
  test("x", () => {
    typescriptSerializerHook;
    expect(graphWin32).not.toBeNull();
  });
});
