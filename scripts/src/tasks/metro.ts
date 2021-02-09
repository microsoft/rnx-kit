import os from "os";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import Metro from "metro";
import { logger, TaskFunction } from "just-task";
import { argv } from "just-scripts";
// TODO: bring this over from FURN: import { addPlatformMetroConfig } from "../configs/configureMetro";

export type AllPlatforms =
  | "win32"
  | "ios"
  | "android"
  | "windows"
  | "web"
  | "macos";

export interface BundleDetails {
  /**
   * entry file such as './src/index.ts'
   */
  entry?: string;
  outputPath?: string;
  bundleName?: string;
  noPlatformSuffix?: boolean;
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
 *    "targets": ["win32", "windows"],
 *    "entryFile": "./src/index.ts",
 *    "outputPath": "./dist",
 *    "outputFile": "myBundleName"
 *  }
 *
 * Platform specific overrides can be specified by using a platforms which works as a selector.  In this case
 * add:
 *  "metroBundles": {
 *    ...stuff
 *    "platforms": {
 *      "ios": {
 *        "outputFile": "myIOSName"
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

  /**
   * route the task to the CLI
   */
  cli?: boolean;
}

function runMetroFromCli(
  platform: AllPlatforms,
  entry: string,
  out: string,
  assetsOut: string,
  dev: boolean,
  server: boolean,
  port?: number
): void {
  const options = { cwd: process.cwd(), stdio: "inherit" } as any;
  const yarnCmd = os.platform() === "win32" ? "yarn.cmd" : "yarn";
  if (server) {
    spawnSync(
      yarnCmd,
      ["react-native", "start", ...(port && ["--port", port.toString()])],
      options
    );
  } else {
    logger.info(`Starting metro bundling for ${platform}.`);
    logger.info(`Entry file ${entry}.`);
    logger.info(`Output file ${out}.`);
    const sourceMap = dev && out + ".map";
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
        out,
        "--dev",
        devValue,
        "--assets-dest",
        assetsOut,
        ...((sourceMap && ["--sourcemap-output", sourceMap]) || []),
      ],
      options
    );
  }
}

async function runMetroDirect(
  platform: AllPlatforms,
  entry: string,
  out: string,
  dev: boolean,
  server: boolean,
  port?: number
): Promise<void> {
  // get the config file, checking if there is a platform specific override
  let configName = `metro.config.${platform}.js`;
  configName = fs.existsSync(path.join(process.cwd(), configName))
    ? configName
    : "metro.config.js";
  const configBase = await Metro.loadConfig({ config: configName });

  // add platform specific details for bundling this config

  // TODO: bring this over from FURN: const config = addPlatformMetroConfig(platform, configBase) as any;
  const config = configBase;

  if (server) {
    config.server = config.server || {};
    config.server.port = port;
  }

  if (server) {
    // for server start up the server, note that this is for only one platform, at least by configuration
    logger.info(
      `Starting metro server for ${platform} platform on port ${port}.`
    );

    await Metro.runServer(config, { port: port });
  } else {
    // log out what is about to happen
    logger.info(`Starting metro bundling for ${platform}.`);
    logger.info(`Entry file ${entry}.`);
    logger.info(`Output file ${out}.`);
    const sourceMap = dev && out + ".map";

    // now run the bundle task itself
    await Metro.runBuild(config, {
      platform: platform,
      entry,
      minify: !dev,
      out,
      optimize: !dev,
      sourceMap,
    });
  }

  // optionally rename the output to remove the JS extension if requested
  if (!out.endsWith(".js")) {
    const metroBundlePath = out + ".js";
    if (fs.existsSync(metroBundlePath)) {
      if (fs.existsSync(out)) {
        logger.verbose(`Deleting existing output file at ${out}...`);
        fs.unlinkSync(out);
      }

      logger.verbose(`Renaming ${metroBundlePath} to ${out}...`);
      fs.renameSync(metroBundlePath, out);
    }
  }

  logger.info(`Finished bundling ${out} for ${platform}.`);
}

export function metroTask(options: MetroTaskOptions = {}): TaskFunction {
  const { bundleName, platform, dev = false, server, cli, port } = options;

  return async function metroPack(done) {
    logger.verbose(`Starting metropack task with platform ${bundleName}...`);

    // get the bundle definition
    const definition = loadBundleDefinition(bundleName);
    const targets = (platform && [platform]) || definition.targets || [];

    for (const targetPlatform of targets) {
      // get the options specified for the platform
      const platformDefinition = getOptionsForPlatform(
        definition,
        targetPlatform
      );

      // set up file input and output
      const {
        entry = "./lib/index.js",
        outputPath = "./dist",
        bundleName,
        noPlatformSuffix,
      } = platformDefinition;
      let out = path.join(outputPath, bundleName);
      if (!noPlatformSuffix) {
        out = `${out}.${targetPlatform}`;
      }

      // ensure the parent directory exists for the target output
      const parentDirectory = path.dirname(path.resolve(process.cwd(), out));
      if (!fs.existsSync(parentDirectory)) {
        fs.mkdirSync(parentDirectory);
      }

      if (cli) {
        runMetroFromCli(
          targetPlatform,
          entry,
          out,
          outputPath,
          !!dev,
          server,
          port
        );
      } else {
        await runMetroDirect(targetPlatform, entry, out, !!dev, server, port);
      }
    }
    if (done) {
      done();
    }
  };
}

export function metro() {
  return metroTask({
    dev: !!argv().dev,
    ...(argv().cli && { cli: true }),
    ...(argv().platform && { platform: argv().platform }),
    ...(argv().bundleName && { bundleName: argv().bundleName }),
    ...(argv().server && { server: true }),
    ...(argv().server && argv().port && { port: argv().port }),
  });
}
