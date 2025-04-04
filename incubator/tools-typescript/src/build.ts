import { findPackageInfo } from "@rnx-kit/tools-packages";
import type { AllPlatforms } from "@rnx-kit/tools-react-native";
import ts from "typescript";
import { loadPackagePlatformInfo } from "./platforms.ts";
import { createReporter } from "./reporter.ts";
import { createBuildTasks } from "./task.ts";
import { readTypeScriptConfig } from "./tsconfig.ts";
import type { BuildContext, BuildOptions, PlatformInfo } from "./types.ts";

/**
 * Execute a build (or just typechecking) for the given package. This can be configured
 * with standard typescript options, but can also be directed to split builds to build
 * and type-check multiple platforms as efficiently as possible.
 *
 * @param options - options for the build
 */
export async function buildTypeScript(options: BuildOptions) {
  // load the base package info
  const pkgInfo = findPackageInfo(options.target);
  const root = pkgInfo.root;
  const reporter = createReporter(pkgInfo.name, options.verbose, options.trace);

  // set up the typescript options and load the config file
  const mergedOptions = {
    ...options.options,
    ...ts.parseCommandLine(options.args || []).options,
  };
  // load the typescript config, project is likely undefined which will fall back to tsconfig.json
  const cmdLine = readTypeScriptConfig(
    pkgInfo,
    mergedOptions.project,
    mergedOptions
  );

  // load/detect the platforms
  let targetPlatforms: PlatformInfo[] | undefined = undefined;
  if (options.platforms || options.reactNative) {
    const platformInfo = loadPackagePlatformInfo(pkgInfo, options.platforms);
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
    build: [],
    check: [],
  };

  // create the set of tasks to run then resolve all the tasks
  try {
    await Promise.all(createBuildTasks(options, context, targetPlatforms));
  } catch (e) {
    throw new Error(`${pkgInfo.name}: Build failed. ${e}`);
  }
}
