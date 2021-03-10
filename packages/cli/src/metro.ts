import os from "os";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import {
  AllPlatforms,
  BundleConfig,
  BundleParameters,
  getBundleDefinition,
  getBundlePlatformDefinition,
} from "@rnx-kit/config";

/**
 * options for metro bundling
 */
export interface MetroBundleOptions {
  /**
   * id of the target bundle, can be blank if the package.json only includes one bundle
   */
  id?: string;

  /**
   * platform to bundle for, if blank will bundle for all platforms in this folder
   */
  platform?: AllPlatforms;

  /**
   * whether to bundle in development mode. if false, warnings are disabled and the bundle is minified
   */
  dev?: boolean;

  /**
   * allows overriding whether bundle is minified.
   * disabling minification can be useful for speeding up production builds for testing purposes.
   */
  minify?: boolean;

  /**
   * specify a custom transformer to be used
   */
  transformer?: string;

  /**
   * specifies the maximum number of workers the worker-pool will spawn for transforming files.
   * this defaults to the number of the cores available on your machine.
   */
  maxWorkers?: number;

  /**
   * whether to remove cached files
   */
  resetCache?: boolean;

  /**
   * whether to try fetching transformed JS code from the global cache, if configured.
   */
  readGlobalCache?: boolean;

  /**
   * Path to the metro CLI configuration file
   */
  config?: string;
}

/**
 * options for starting a metro server
 */
export interface MetroStartOptions {
  /**
   * port override
   */
  port?: number;
}

function yarnSync(args: string[]): void {
  const yarnCommand = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  const spawnOptions = { cwd: process.cwd(), stdio: "inherit" } as any;
  spawnSync(yarnCommand, args, spawnOptions);
}

function optionalParam(name: string, value: any): Array<any> {
  if (typeof value === "number" || typeof value === "boolean") {
    // value is a boolean or a number, meaning it has a real value that came from the
    // rnx-kit cmdline. therefore, we don't need to test it before emitting it as a param.
    // besides, doing so would eliminate 0 and false, since they both evaluate as 'falsey'.
    // instead, just string-serialize the value given, and return it.
    return [name, value.toString()];
  }
  return (value && [name, value]) || [];
}

function optionalFlag(name: string, value: any): Array<any> {
  return (value && [name]) || [];
}

export function metroBundle(
  config: BundleConfig,
  options: MetroBundleOptions,
  overrides: BundleParameters
) {
  const {
    id,
    platform,
    dev = false,
    minify,
    transformer,
    maxWorkers,
    resetCache,
    readGlobalCache,
    config: metroConfig,
  } = options;

  console.log("Generating metro bundle(s)" + (id ? ` for id ${id}...` : "..."));

  // get the bundle definition
  const definition = getBundleDefinition(config, id);
  const targets = (platform && [platform]) || definition.targets || [];

  for (const targetPlatform of targets) {
    const bundleExtension =
      targetPlatform === "ios" || targetPlatform === "macos"
        ? "jsbundle"
        : "bundle";

    // get the options specified for the platform
    const platformDefinition = getBundlePlatformDefinition(
      definition,
      targetPlatform
    );

    //  apply overrides
    const overrideDefinition = {
      ...platformDefinition,
      ...overrides,
    };

    //  extract the final values
    const {
      entryPath,
      distPath,
      assetsPath,
      bundlePrefix,
      bundleEncoding,
      sourceMapPath,
      sourceMapSourceRootPath,
      sourceMapUseAbsolutePaths,
    } = overrideDefinition;

    const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
    const bundlePath = path.join(distPath as string, bundleFile);

    // ensure the parent directory exists for the target output
    const parentDirectory = path.dirname(
      path.resolve(process.cwd(), bundlePath)
    );
    if (!existsSync(parentDirectory)) {
      mkdirSync(parentDirectory);
    }

    const devBool = !!dev;
    const sourceMap = sourceMapPath || (devBool && bundlePath + ".map");

    yarnSync([
      "react-native",
      "bundle",
      "--platform",
      targetPlatform,
      "--entry-file",
      entryPath as string,
      "--bundle-output",
      bundlePath as string,
      ...optionalParam("--bundle-encoding", bundleEncoding),
      ...optionalParam("--transformer", transformer),
      "--assets-dest",
      assetsPath as string,
      "--dev",
      devBool ? "true" : "false",
      ...optionalParam("--minify", minify),
      ...optionalParam("--max-workers", maxWorkers),
      ...optionalParam("--sourcemap-output", sourceMap),
      ...optionalParam("--sourcemap-sources-root", sourceMapSourceRootPath),
      ...optionalFlag(
        "--sourcemap-use-absolute-path",
        sourceMapUseAbsolutePaths
      ),
      ...optionalFlag("--reset-cache", resetCache),
      ...optionalFlag("--read--global-cache", readGlobalCache),
      ...optionalParam("--config", metroConfig),
    ]);
  }
}

export function metroStart(options: MetroStartOptions): void {
  const { port } = options;

  console.log("Starting metro server...");

  yarnSync(["react-native", "start", ...optionalParam("--port", port)]);
}
