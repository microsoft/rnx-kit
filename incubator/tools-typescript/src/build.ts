import { findPackage, readPackage } from "@rnx-kit/tools-node";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import { findConfigFile, readConfigFile } from "@rnx-kit/typescript-service";
import path from "node:path";
import ts from "typescript";
import { loadPkgPlatformInfo } from "./platforms";
import { createReporter } from "./reporter";
import { createBuildTasks } from "./task";
import type { BuildContext, BuildOptions, PlatformInfo } from "./types";

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
    options.project ?? findConfigFile(pkgRoot, "tsconfig.json");

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
 * Execute a build (or just typechecking) for the given package. This can be configured
 * with standard typescript options, but can also be directed to split builds to build
 * and type-check multiple platforms as efficiently as possible.
 *
 * @param options - options for the build
 */
export async function buildTypeScript(options: BuildOptions) {
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
  let targetPlatforms: PlatformInfo[] | undefined = undefined;
  if (options.platforms || options.reactNative) {
    const platformInfo = loadPkgPlatformInfo(root, manifest, options.platforms);
    const platforms = Object.keys(platformInfo);
    if (platforms.length > 0) {
      options.platforms = platforms as AllPlatforms[];
      targetPlatforms = platforms.map((name) => platformInfo[name]);
    }
  }

  if (options.verbose) {
    const module = cmdLine.options.module;
    const moduleStr =
      module === ts.ModuleKind.CommonJS
        ? "cjs"
        : module === ts.ModuleKind.ESNext
          ? "esm"
          : "none";
    const output = cmdLine.options.noEmit ? "noEmit" : cmdLine.options.outDir;
    const platforms = options.platforms
      ? ` [${options.platforms.join(", ")}]`
      : "";
    reporter.log(`Starting build (${moduleStr} -> ${output})${platforms}`);
  }

  // turn the parsed command line and options into a build context
  const context: BuildContext = {
    cmdLine,
    root,
    reporter,
  };

  // create the set of tasks to run then resolve all the tasks
  try {
    await Promise.all(createBuildTasks(options, context, targetPlatforms));
  } catch (e) {
    throw new Error(`${manifest.name}: Build failed`, { cause: e });
  }
}
