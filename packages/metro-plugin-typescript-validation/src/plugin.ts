import type {
  Graph,
  MetroPlugin,
  Module,
  SerializerOptions,
} from "@rnx-kit/metro-serializer";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import * as crypto from "crypto";
const yargs = require("yargs/yargs");
import { hideBin } from "yargs/helpers";

export function getModuleRoot(module: string): string {
  const p = require.resolve(module);
  const index = p.indexOf(module);
  return p.slice(0, index + module.length);
}

export function readTsConfig(projectRoot: string) {
  const p = path.join(projectRoot, "tsconfig.json");
  return JSON.parse(fs.readFileSync(p, { encoding: "utf8" }));
}

export function writeMetroTsConfig(
  projectRoot: string,
  tsconfig: object
): string {
  const json = JSON.stringify(tsconfig);
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const tsconfigMetroPath = path.join(
    projectRoot,
    `tsconfig-metro-${uniqueId}.json`
  );
  fs.writeFileSync(tsconfigMetroPath, json);
  return tsconfigMetroPath;
}

export function runTypeScriptCompiler(projectPath: string) {
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
  scopePath: string,
  visited: Record<string, boolean>,
  files: Array<string>
) {
  //  avoid circular references in the dependency graph
  if (modulePath in visited) {
    return;
  }
  visited[modulePath] = true;

  //  collect any file that is in scope, and keep its relative path
  if (modulePath.startsWith(scopePath)) {
    const p = modulePath.slice(scopePath.length);
    files.push(p[0] === "/" ? p.slice(1) : p);
  }

  //  recursively visit children
  graph.dependencies
    .get(modulePath)
    ?.dependencies?.forEach((m) =>
      visit(m.absolutePath, graph, scopePath, visited, files)
    );
}

export function TypescriptValidation(): MetroPlugin {
  //  read the --platform argument from the Metro command-line
  const argv = yargs(hideBin(process.argv)).argv;
  const platform = argv.platform;

  return (
    _entryPoint: string,
    _preModules: ReadonlyArray<Module>,
    graph: Graph,
    options: SerializerOptions
  ) => {
    const visited: Record<string, boolean> = {};
    const files: Array<string> = [];

    graph.entryPoints.forEach((m) =>
      visit(m, graph, options.projectRoot, visited, files)
    );

    const tsconfig = readTsConfig(options.projectRoot);

    //  remove include/exclude directives
    delete tsconfig.include;
    delete tsconfig.exclude;

    //  set the specific list of files to type-check
    tsconfig.files = files;

    //  compiler options:
    //    - don't emit any codegen files
    //    - resolve modules using platform overrides
    tsconfig.compilerOptions = tsconfig.compilerOptions || {};
    tsconfig.compilerOptions.noEmit = true;
    tsconfig.compilerOptions.resolutionPlatforms = [platform, "native"];

    //  write the altered tsconfig, run TSC, and then cleanup the altered tsconfig
    const tsconfigMetroPath = writeMetroTsConfig(options.projectRoot, tsconfig);
    try {
      runTypeScriptCompiler(tsconfigMetroPath);
    } finally {
      fs.unlinkSync(tsconfigMetroPath);
    }
  };
}
