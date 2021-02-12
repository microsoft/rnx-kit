import os from "os";
import { spawnSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import {
  AllPlatforms,
  BundleConfig,
  getBundleDefinition,
  getBundlePlatformDefinition,
} from "@rnx-kit/config";

// TODO: bring this over from FURN: import { addPlatformMetroConfig } from "../configs/configureMetro";

/**
 * options for running metro bundling
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
   * whether to bundle in development mode
   */
  dev?: boolean;

  /**
   * run metro in server mode
   */
  server?: boolean;

  /**
   * port override for server mode
   */
  port?: number;
}

function runMetroBundle(
  platform: AllPlatforms,
  entryPath: string,
  bundlePath: string,
  assetsPath: string,
  dev: boolean,
  server: boolean,
  port?: number
): void {
  const yarnCmd = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  const options = { cwd: process.cwd(), stdio: "inherit" } as any;

  let args: string[];
  if (server) {
    args = ["react-native", "start", ...(port && ["--port", port.toString()])];
  } else {
    const sourceMap = dev && bundlePath + ".map";
    const devValue = dev ? "true" : "false";
    args = [
      "react-native",
      "bundle",
      "--platform",
      platform,
      "--entry-file",
      entryPath,
      "--bundle-output",
      bundlePath,
      "--dev",
      devValue,
      "--assets-dest",
      assetsPath,
      ...((sourceMap && ["--sourcemap-output", sourceMap]) || []),
    ];
  }

  console.log("%s %s", yarnCmd, args.join(" "));
  spawnSync(yarnCmd, args, options);
}

export function metroBundle(config: BundleConfig, options: MetroBundleOptions) {
  const { id, platform, dev = false, server, port } = options;

  console.log("Starting metro" + (id ? ` for bundle id ${id}...` : "..."));

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

    const {
      entryPath,
      distPath,
      assetsPath,
      bundlePrefix,
    } = platformDefinition;

    const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
    const bundlePath = path.join(distPath, bundleFile);

    // ensure the parent directory exists for the target output
    const parentDirectory = path.dirname(
      path.resolve(process.cwd(), bundlePath)
    );
    if (!existsSync(parentDirectory)) {
      mkdirSync(parentDirectory);
    }

    runMetroBundle(
      targetPlatform,
      entryPath,
      bundlePath,
      assetsPath,
      !!dev,
      server,
      port
    );
  }
}
