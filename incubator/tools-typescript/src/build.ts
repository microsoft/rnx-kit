import { createReporter } from "./reporter";
import type { BuildContext, BuildOptions, PlatformInfo } from "./types";

import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { readConfigFile } from "@rnx-kit/typescript-service";

import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import path from "node:path";
import ts from "typescript";
import { loadPkgPlatformInfo } from "./platforms";
import { createBuildTasks } from "./task";

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
    ? //  ? readConfigFile(configPath, sanitizeOptions(options))
      readConfigFile(configPath, options)
    : undefined;

  if (!config) {
    throw new Error("Unable to find tsconfig.json");
  }
  return config;
}

/**
 * Execute a build (or just typechecking) for the given package
 * @param options - options for the build
 */
export async function buildTypescript(options: BuildOptions): Promise<boolean> {
  // load the base package json
  const pkgJsonPath = findPackage(options.target);
  if (!pkgJsonPath) {
    throw new Error("Unable to find package.json for " + options.target);
  }
  const manifest = readPackage(pkgJsonPath);
  const root = path.dirname(pkgJsonPath);
  const reporter = createReporter(
    manifest.name,
    options.verbose,
    options.trace
  );

  // set up the typescript options and load the config file
  const mergedOptions = {
    ...options.options,
    ...ts.parseCommandLine(options.args || []).options,
  };
  const cmdLine = loadTypescriptConfig(root, mergedOptions);

  // load/detect the platforms
  let platformInfo: Record<string, PlatformInfo> = {};
  if (options.platforms || options.reactNative) {
    platformInfo = loadPkgPlatformInfo(root, manifest, options.platforms);
    const platforms = Object.keys(platformInfo);
    reporter.log(platformInfo);
    options.platforms =
      platforms.length > 0 ? (platforms as AllPlatforms[]) : undefined;
  }

  if (options.verbose && options.platforms) {
    reporter.log(`Executing for platforms: ${options.platforms.join(", ")}`);
  }

  reporter.log(
    `building platforms: ${options.platforms?.join(", ")} instance: ${instanceCount++}`
  );

  // turn the parsed command line and options into a build context
  const context: BuildContext = {
    cmdLine,
    root,
    reporter,
  };

  // create the set of tasks to run then resolve all the tasks
  const results = await Promise.all(createBuildTasks(options, context));
  return reporter.succeeded(true) && results.every((r) => r);
}
