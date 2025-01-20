import type { Tracer } from "./tracer";
import type { ToolCmdLineOptions } from "./types";

import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { readConfigFile } from "@rnx-kit/typescript-service";

import path from "path";
import ts from "typescript";
import { createBuildTasks } from "./build";
import { detectReactNativePlatforms } from "./platforms";
import { sanitizeOptions } from "./tsOptions";

let instanceCount = 1;

/**
 * Load the tsconfig.json file for the package
 * @param pkgRoot the root directory of the package
 * @param args the command line arguments to be passed to typescript
 * @returns the parsed tsconfig.json file, if found
 */
function loadTypescriptConfig(
  pkgRoot: string,
  options: ts.CompilerOptions = {}
): ts.ParsedCommandLine {
  // find the tsconfig.json, overriding with project if it is set
  const configPath =
    options.project ??
    ts.findConfigFile(pkgRoot, ts.sys.fileExists, "tsconfig.json");

  // now load the config, mixing in the command line options
  const config = configPath
    ? readConfigFile(configPath, sanitizeOptions(options))
    : undefined;

  if (!config) {
    throw new Error("Unable to find tsconfig.json");
  }
  return config;
}

export async function runBuild(
  options: ToolCmdLineOptions,
  tsOptions: ts.CompilerOptions,
  tracer: Tracer
) {
  // load the base package json
  const pkgJsonPath = findPackage();
  if (!pkgJsonPath) {
    throw new Error("Unable to find package.json");
  }
  const manifest = readPackage(pkgJsonPath);
  const root = path.dirname(pkgJsonPath);
  tracer.setName(`ts-tool: ${manifest.name}`);

  // load/detect the platforms
  if (!options.platforms && options.detectPlatforms) {
    options.platforms = detectReactNativePlatforms(manifest, root);
  }

  // find and load the typescript config file
  const parsedCmdLine = loadTypescriptConfig(root, tsOptions);
  tracer.log(
    `building for platforms: ${options.platforms?.join(", ")} instance: ${instanceCount++}`
  );

  // create the set of tasks to run then resolve all the tasks
  const tasks = createBuildTasks(parsedCmdLine, options, tracer);
  return Promise.all(tasks);
}

export async function runBuildCmdline(
  options: ToolCmdLineOptions,
  args: string[],
  tracer: Tracer
) {
  const tsOptions = args.length > 0 ? ts.parseCommandLine(args).options : {};
  return await runBuild(options, tsOptions, tracer);
}
