import type {
  Dependencies,
  Graph,
  MetroPlugin,
  MixedOutput,
  Module,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";
import { getWorkspaces } from "workspace-tools";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
const yargs = require("yargs/yargs");
import { hideBin } from "yargs/helpers";

export function getModuleRoot(module: string): string {
  return path.dirname(require.resolve(module + "/package.json"));
}

export function readTsConfig(projectRoot: string) {
  const p = path.join(projectRoot, "tsconfig.json");
  return JSON.parse(fs.readFileSync(p, { encoding: "utf8" }));
}

export function writeMetroTsConfigToNodeModules(
  projectRoot: string,
  tsconfig: Record<string, unknown>
): string {
  const json = JSON.stringify(tsconfig);
  const tsconfigMetroPath = path.join(
    projectRoot,
    "node_modules",
    "tsconfig-metro.json"
  );
  fs.writeFileSync(tsconfigMetroPath, json);
  return tsconfigMetroPath;
}

export function runTypeScriptCompiler(projectPath: string): void {
  const tscPath = path.join(
    getModuleRoot("@msfast/typescript-platform-resolution"),
    "lib",
    "tsc.js"
  );

  const spawnOptions: child_process.SpawnSyncOptions = {
    cwd: process.cwd(),
    stdio: "inherit",
  };
  const args = [tscPath, "--project", projectPath];
  const processInfo = child_process.spawnSync(
    process.execPath,
    args,
    spawnOptions
  );
  if (processInfo.status) {
    throw (
      processInfo.error ||
      new Error(
        "TypeScript validation failed with exit code " + processInfo.status
      )
    );
  } else if (processInfo.signal) {
    throw (
      processInfo.error ||
      new Error("TypeScript validation crashed due to " + processInfo.signal)
    );
  }
}

export async function visit(
  modulePath: string,
  graph: Graph,
  scopePaths: string[],
  visited: Record<string, boolean>,
  files: Array<string>
): Promise<void> {
  //  avoid circular references in the dependency graph
  if (modulePath in visited) {
    return;
  }
  visited[modulePath] = true;

  //  collect any file that is in scope
  if (scopePaths.some((scopePath) => modulePath.startsWith(scopePath))) {
    files.push(modulePath);
  }

  //  recursively visit children
  graph.dependencies
    .get(modulePath)
    ?.dependencies?.forEach((m) =>
      visit(m.absolutePath, graph, scopePaths, visited, files)
    );
}

export type Delta = {
  added: Dependencies<MixedOutput>;
  modified: Dependencies<MixedOutput>;
  deleted: Set<string>;
  reset: boolean;
};
export function experimentalSerializerHook(graph: Graph, delta: Delta) {
  // @ts-ignore
  console.log(
    "HOOK: reset=%o, platform=%o",
    delta.reset,
    graph.transformOptions.platform
  );
  delta?.added?.forEach((_module, moduleName) => {
    console.log("  ADD: %o", moduleName);
  });
  delta?.modified?.forEach((_module, moduleName) => {
    console.log("  MOD: %o", moduleName);
  });
  delta?.deleted?.forEach((moduleName) => {
    console.log("  DEL: %o", moduleName);
  });
}

export function TypeScriptValidation(): MetroPlugin {
  //  read the --platform argument from the Metro command-line
  const argv = yargs(hideBin(process.argv)).argv;
  const platform = argv.platform.toLowerCase();
  const resolutionPlatforms = ["win32", "windows"].includes(platform)
    ? [platform, "win", "native"]
    : [platform, "native"];

  return (
    _entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ) => {
    const workspaces = getWorkspaces(options.projectRoot);
    const scopePaths = workspaces.map((workspace) => workspace.path);
    scopePaths.push(options.projectRoot);

    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graph.entryPoints.forEach((m) =>
      visit(m, graph, scopePaths, visited, files)
    );

    const tsconfig = readTsConfig(options.projectRoot);

    //  remove include/exclude directives
    delete tsconfig.include;
    delete tsconfig.exclude;

    //  set the specific list of files to type-check
    const allowedExtensions = [".ts", ".tsx"];
    if (
      tsconfig.compilerOptions?.allowJs &&
      tsconfig.compilerOptions?.checkJs
    ) {
      allowedExtensions.push(".js", ".jsx");
    }
    tsconfig.files = files.filter((f) =>
      allowedExtensions.includes(path.extname(f).toLowerCase())
    );

    //  compiler options:
    //    - don't emit any codegen files
    //    - resolve modules using platform overrides
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.noEmit = true;
    tsconfig.compilerOptions.resolutionPlatforms = resolutionPlatforms;

    //  extends prop -- if given and a relative path, it is relative to
    //  <projectRoot>, since that is where tsconfig.json came from. the
    //  generated tsconfig for Metro will be in <projectRoot>/node_modules,
    //  so we need to re-relativize it.
    if (tsconfig.extends?.startsWith(".")) {
      tsconfig.extends = path.join("..", tsconfig.extends);
    }

    //  write the altered tsconfig, run TSC, and then cleanup the altered tsconfig
    const tsconfigMetroPath = writeMetroTsConfigToNodeModules(
      options.projectRoot,
      tsconfig
    );
    try {
      runTypeScriptCompiler(tsconfigMetroPath);
    } finally {
      fs.unlinkSync(tsconfigMetroPath);
    }
  };
}
