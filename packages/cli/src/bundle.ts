import type { Config as CLIConfig } from "@react-native-community/cli-types";
import {
  AllPlatforms,
  BundleDefinitionWithRequiredParameters,
  getBundleDefinition,
  getBundlePlatformDefinition,
  getKitConfig,
} from "@rnx-kit/config";
import { bundle, BundleArgs, loadMetroConfig } from "@rnx-kit/metro-service";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { customizeMetroConfig, validateMetroConfig } from "./metro-config";

type CLIBundleOptions = {
  id?: string;
  platform?: AllPlatforms;
  entryPath?: string;
  distPath?: string;
  assetsPath?: string;
  bundlePrefix?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  transformer?: string;
  dev: boolean;
  minify?: boolean;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  resetCache?: boolean;
  config?: string;
  verbose: boolean;
};

function ensureDirectoryExists(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true, mode: 0o755 });
}

function getKitConfigBundleDefinition(
  id?: string
): BundleDefinitionWithRequiredParameters | undefined {
  //  get the rnx kit config, and make sure bundling is enabled
  const kitConfig = getKitConfig();
  if (
    !kitConfig ||
    kitConfig.bundle === null ||
    kitConfig.bundle === undefined
  ) {
    console.warn(
      chalk.yellow(
        "No bundle configuration found for this react-native experience -- skipping bundling"
      )
    );
    return undefined;
  } else if (!kitConfig.bundle) {
    console.warn(
      chalk.yellow(
        "Bundling is disabled for this react-native experience -- skipping"
      )
    );
    return undefined;
  }

  // get the bundle definition
  return getBundleDefinition(kitConfig.bundle, id);
}

export async function rnxBundle(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliBundleOptions: CLIBundleOptions
): Promise<void> {
  //  unpack the CLI options that will effect all bundles
  const {
    id,
    dev,
    minify,
    transformer,
    maxWorkers,
    resetCache,
    config,
    verbose,
  } = cliBundleOptions;

  //  load the Metro configuration
  const metroConfig = await loadMetroConfig(cliConfig, {
    config,
    maxWorkers,
    resetCache,
  });
  if (!validateMetroConfig(metroConfig)) {
    return Promise.resolve();
  }

  //  get the kit config's bundle definition using the optional id
  const definition = getKitConfigBundleDefinition(id);
  if (!definition) {
    //  bundling is disabled, or the kit has no bundle definitions
    console.warn(
      "skipping bundling -- kit configuration does not define any bundles"
    );
    return Promise.resolve();
  }

  //  get the list of target platforms, favoring the command-line over the bundle definition
  let targetPlatforms: AllPlatforms[] = [];
  if (cliBundleOptions.platform) {
    targetPlatforms.push(cliBundleOptions.platform);
  } else if (definition.targets) {
    targetPlatforms = definition.targets;
  }

  if (targetPlatforms.length === 0) {
    console.error("no target platforms given");
    return Promise.reject(
      new Error(
        "No target platforms given. Update the kit configuration to include a target platform, or provide a target platform on the command-line."
      )
    );
  }

  //  create a bundle for each target platform
  for (const targetPlatform of targetPlatforms) {
    //  unpack the platform-specific bundle definition
    const platformDefinition = getBundlePlatformDefinition(
      definition,
      targetPlatform
    );
    let {
      entryPath,
      distPath,
      assetsPath,
      bundlePrefix,
      bundleEncoding,
      sourceMapPath,
      sourceMapSourceRootPath,
    } = platformDefinition;
    const { detectCyclicDependencies, detectDuplicateDependencies } =
      platformDefinition;

    //  apply command-line overrides to the platform-specific bundle definition
    entryPath = cliBundleOptions.entryPath ?? entryPath;
    distPath = cliBundleOptions.distPath ?? distPath;
    assetsPath = cliBundleOptions.assetsPath ?? assetsPath;
    bundlePrefix = cliBundleOptions.bundlePrefix ?? bundlePrefix;
    bundleEncoding = cliBundleOptions.bundleEncoding ?? bundleEncoding;
    sourceMapPath = cliBundleOptions.sourcemapOutput ?? sourceMapPath;
    sourceMapSourceRootPath =
      cliBundleOptions.sourcemapSourcesRoot ?? sourceMapSourceRootPath;

    //  assemble the full path to the bundle file
    const bundleExtension =
      targetPlatform === "ios" || targetPlatform === "macos"
        ? "jsbundle"
        : "bundle";
    const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
    const bundlePath = path.join(distPath, bundleFile);

    //  always create a source-map in dev mode
    if (dev) {
      sourceMapPath = sourceMapPath ?? bundleFile + ".map";
    }

    //  assemble the full path the source map file
    if (sourceMapPath) {
      sourceMapPath = path.join(distPath, sourceMapPath);
    }

    customizeMetroConfig(
      metroConfig,
      detectCyclicDependencies,
      detectDuplicateDependencies
    );

    //  ensure all output directories exist
    ensureDirectoryExists(path.dirname(bundlePath));
    sourceMapPath && ensureDirectoryExists(path.dirname(sourceMapPath));
    assetsPath && ensureDirectoryExists(assetsPath);

    //  create the bundle
    console.log(`Bundling ${targetPlatform}...`);
    await bundle(
      {
        assetsDest: assetsPath,
        entryFile: entryPath,
        resetCache: !!resetCache,
        transformer,
        minify,
        config,
        platform: targetPlatform,
        dev,
        bundleOutput: bundlePath,
        bundleEncoding,
        maxWorkers,
        sourcemapOutput: sourceMapPath,
        sourcemapSourcesRoot: sourceMapSourceRootPath,
        verbose,
        //unstableTransformProfile?: string;
      },
      metroConfig
    );
  }

  return Promise.resolve();
}
