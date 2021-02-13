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

export function metroBundle(
  config: BundleConfig,
  options: MetroBundleOptions,
  overrides: BundleParameters
) {
  const { id, platform, dev = false } = options;

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
    } = overrideDefinition;

    const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
    const bundlePath = path.join(distPath, bundleFile);

    // ensure the parent directory exists for the target output
    const parentDirectory = path.dirname(
      path.resolve(process.cwd(), bundlePath)
    );
    if (!existsSync(parentDirectory)) {
      mkdirSync(parentDirectory);
    }

    const devBool = !!dev;
    const sourceMap = devBool && bundlePath + ".map";
    yarnSync([
      "react-native",
      "bundle",
      "--platform",
      targetPlatform,
      "--entry-file",
      entryPath,
      "--bundle-output",
      bundlePath,
      "--dev",
      devBool ? "true" : "false",
      "--assets-dest",
      assetsPath,
      ...((sourceMap && ["--sourcemap-output", sourceMap]) || []),
    ]);
  }
}

export function metroStart(options: MetroStartOptions): void {
  const { port } = options;

  console.log("Starting metro server...");

  yarnSync([
    "react-native",
    "start",
    ...(port ? ["--port", port.toString()] : []),
  ]);
}
