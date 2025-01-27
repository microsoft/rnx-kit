import { Tracer } from "./tracer";
import type { BuildContext, BuildOptions } from "./types";

import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { readConfigFile } from "@rnx-kit/typescript-service";

import path from "node:path";
import ts from "typescript";
import { detectReactNativePlatforms } from "./platforms";
import { createBuildTasks } from "./task";
import { sanitizeOptions } from "./tsoptions";

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

function createBuildContext(
  options: BuildOptions,
  cmdLine: ts.ParsedCommandLine,
  tracer: Tracer
): BuildContext {
  return {
    ...options,
    cmdLine,
    log: tracer.log.bind(tracer),
    time: tracer.time.bind(tracer),
    timeAsync: tracer.timeAsync.bind(tracer),
  };
}

/**
 * Execute a build (or just typechecking) for the given package
 * @param options - options for the build
 */
export async function buildTypescript(options: BuildOptions) {
  // load the base package json
  const pkgJsonPath = findPackage(options.target);
  if (!pkgJsonPath) {
    throw new Error("Unable to find package.json for " + options.target);
  }
  const manifest = readPackage(pkgJsonPath);
  const root = path.dirname(pkgJsonPath);
  options.target = root;
  const tracer = new Tracer(manifest.name, !!options.verbose, !!options.trace);

  // set up the typescript options and load the config file
  const mergedOptions = {
    ...options.options,
    ...ts.parseCommandLine(options.args || []).options,
  };
  const parsedCmdLine = loadTypescriptConfig(root, mergedOptions);

  // load/detect the platforms
  if (!options.platforms && options.detectPlatforms) {
    options.platforms = detectReactNativePlatforms(manifest, root);
  }

  tracer.log(
    `building platforms: ${options.platforms?.join(", ")} instance: ${instanceCount++}`
  );

  // turn the parsed command line and options into a build context
  const context = createBuildContext(options, parsedCmdLine, tracer);

  // create the set of tasks to run then resolve all the tasks
  return await Promise.all(createBuildTasks(context)).then(() =>
    tracer.finish()
  );
}
