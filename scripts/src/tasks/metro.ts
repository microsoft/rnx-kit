import os from "os";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { logger, TaskFunction } from "just-task";
import { argv } from "just-scripts";
// TODO: bring this over from FURN: import { addPlatformMetroConfig } from "../configs/configureMetro";

export type AllPlatforms = "ios" | "android" | "windows" | "macos";

export interface BundleDetails {
  /**
   * entry file such as './src/index.ts'
   */
  entry?: string;
  outputPath?: string;
  assetsPath?: string;
  bundleName?: string;
}

export type BundleDefinition = BundleDetails & {
  name?: string;
  targets?: AllPlatforms[];
  platforms?: { [K in AllPlatforms]: BundleDetails };
};

export type MetroBundles = BundleDefinition | BundleDefinition[];

function asArray<T>(opt: T | T[]): T[] {
  return Array.isArray(opt) ? opt : [opt || ({} as T)];
}

/**
 * Load a bundle definition from package.json.  The bundle definition should be of type BundleDefinition and would
 * typically look something like:
 *  "metroBundles": {
 *    "targets": ["ios", "windows"],
 *    "entry": "./src/index.ts",
 *    "outputPath": "./dist",
 *    "bundleName": "myBundleName"
 *  }
 *
 * Platform specific overrides can be specified by using a platforms which works as a selector.  In this case
 * add:
 *  "metroBundles": {
 *    ...stuff
 *    "platforms": {
 *      "ios": {
 *        "bundleName": "myIOSName"
 *      }
 *    }
 *  }
 * @param bundleName - optional name of the bundle, use if there are multiple bundles defined in package JSON
 */
function loadBundleDefinition(bundleName?: string): BundleDefinition {
  const packageConfigPath = path.resolve(process.cwd(), "package.json");
  const packageConfig = JSON.parse(fs.readFileSync(packageConfigPath, "utf8"));

  const metroBundles = asArray<BundleDefinition>(packageConfig.metroBundles);
  if (bundleName) {
    return metroBundles.find((bundle) => bundle.name === bundleName) || {};
  }

  if (metroBundles.length > 1) {
    logger.error(
      "Multiple bundles are specified in the package, so bundle is ambiguous"
    );
  } else if (metroBundles.length === 0) {
    logger.error("The package must contain a bundle definition");
  }
  return metroBundles[0];
}

/**
 * Resolves the platform selector for each bundle target
 * @param bundle - bundle definition, potentially including a platform selector
 * @param platform - current platform target
 */
function getOptionsForPlatform(
  bundle: BundleDefinition,
  platform: AllPlatforms
): BundleDefinition {
  const platformValues = bundle.platforms && bundle.platforms[platform];
  return platformValues ? { ...bundle, ...platformValues } : bundle;
}

/**
 * options for the metro task
 */
export interface MetroTaskOptions {
  /**
   * name of the bundle to target, can be blank if the package.json only includes one bundle
   */
  bundleName?: string;

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

function runMetroFromCli(
  platform: AllPlatforms,
  entry: string,
  bundlePath: string,
  assetsDir: string,
  dev: boolean,
  server: boolean,
  port?: number
): void {
  const options = { cwd: process.cwd(), stdio: "inherit" } as any;
  const yarnCmd = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  if (server) {
    spawnSync(
      yarnCmd,
      [
        "react-native",
        "start",
        ...((port && ["--port", port.toString()]) || []),
      ],
      options
    );
  } else {
    logger.info(`Starting metro bundling for ${platform}.`);
    logger.info(`Entry file ${entry}.`);
    logger.info(`Output file ${bundlePath}.`);
    logger.info(`Assets directory ${assetsDir}.`);
    const sourceMap = dev && bundlePath + ".map";
    const devValue = dev ? "true" : "false";
    spawnSync(
      yarnCmd,
      [
        "react-native",
        "bundle",
        "--platform",
        platform,
        "--entry-file",
        entry,
        "--bundle-output",
        bundlePath,
        "--dev",
        devValue,
        "--assets-dest",
        assetsDir,
        ...((sourceMap && ["--sourcemap-output", sourceMap]) || []),
      ],
      options
    );
  }
}

function metroTask(options: MetroTaskOptions = {}): TaskFunction {
  const { bundleName, platform, dev = false, server, port } = options;

  return async function metroPack(done) {
    logger.verbose(
      "Starting metropack task" +
        (bundleName ? ` for bundle ${bundleName}...` : "...")
    );

    // get the bundle definition
    const definition = loadBundleDefinition(bundleName);
    const targets = (platform && [platform]) || definition.targets || [];

    for (const targetPlatform of targets) {
      const bundleExtension =
        targetPlatform === "ios" || targetPlatform === "macos"
          ? "jsbundle"
          : "bundle";

      // get the options specified for the platform
      const platformDefinition = getOptionsForPlatform(
        definition,
        targetPlatform
      );

      // set up file input and output
      const {
        entry = "./lib/index.js",
        outputPath = "./dist",
        assetsPath = "./dist",
        bundleName = "index",
      } = platformDefinition;

      const bundleFile = `${bundleName}.${targetPlatform}.${bundleExtension}`;
      const bundlePath = path.join(outputPath, bundleFile);

      // ensure the parent directory exists for the target output
      const parentDirectory = path.dirname(
        path.resolve(process.cwd(), bundlePath)
      );
      if (!fs.existsSync(parentDirectory)) {
        fs.mkdirSync(parentDirectory);
      }

      runMetroFromCli(
        targetPlatform,
        entry,
        bundlePath,
        assetsPath,
        !!dev,
        !!server,
        port
      );
    }
    if (done) {
      done();
    }
  };
}

export const metro = metroTask({
  dev: !!argv().dev,
  ...(argv().platform && { platform: argv().platform }),
  ...(argv().bundleName && { bundleName: argv().bundleName }),
  ...(argv().server && { server: true }),
  ...(argv().server && argv().port && { port: argv().port }),
});
