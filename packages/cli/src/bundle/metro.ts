import { info, warn } from "@rnx-kit/console";
import { bundle, BundleArgs as MetroBundleArgs } from "@rnx-kit/metro-service";
import { createDirectory } from "@rnx-kit/tools-node/fs";
import { findConfigFile, Service } from "@rnx-kit/typescript-service";
import chalk from "chalk";
import type { ConfigT } from "metro-config";
import path from "path";
import { customizeMetroConfig } from "../metro-config";
import type { TSProjectInfo } from "../types";
import type { BundleConfig } from "./types";

/**
 * Create Metro bundler arguments from a bundle configuration.
 *
 * @param bundleConfig Bundle configuration
 * @returns Metro bundle arguments
 */
export function createMetroBundleArgs({
  entryPath: entryFile,
  distPath,
  assetsPath: assetsDest,
  bundlePrefix,
  bundleEncoding,
  sourceMapPath: sourcemapOutput,
  sourceMapSourceRootPath: sourcemapSourcesRoot,
  platform,
  dev,
  minify,
}: BundleConfig): MetroBundleArgs {
  //  assemble the full path to the bundle file
  const bundleExtension =
    platform === "ios" || platform === "macos" ? "jsbundle" : "bundle";
  const bundleFile = `${bundlePrefix}.${platform}.${bundleExtension}`;
  const bundlePath = path.join(distPath, bundleFile);

  //  always create a source-map in dev mode
  if (dev) {
    sourcemapOutput = sourcemapOutput ?? bundleFile + ".map";
  }

  //  use an absolute path for the source map file
  if (sourcemapOutput) {
    sourcemapOutput = path.join(distPath, sourcemapOutput);
  }

  return {
    assetsDest,
    entryFile,
    minify,
    platform,
    dev,
    bundleOutput: bundlePath,
    bundleEncoding,
    sourcemapOutput,
    sourcemapSourcesRoot,
  };
}

/**
 * Run the Metro bundler.
 *
 * @param tsservice TypeScript service to use for type-checking (when enabled)
 * @param metroConfig Metro configuration
 * @param bundleConfig Bundle configuration
 */
export async function metroBundle(
  tsservice: Service,
  metroConfig: ConfigT,
  bundleConfig: BundleConfig
): Promise<void> {
  info(`Bundling ${bundleConfig.platform}...`);

  let tsprojectInfo: TSProjectInfo | undefined;
  if (bundleConfig.typescriptValidation) {
    const configFileName = findConfigFile(
      bundleConfig.entryPath,
      "tsconfig.json"
    );
    if (!configFileName) {
      warn(
        chalk.yellow(
          "skipping TypeScript validation -- cannot find tsconfig.json for entry file %o"
        ),
        bundleConfig.entryPath
      );
    } else {
      tsprojectInfo = {
        service: tsservice,
        configFileName,
      };
    }
  }

  customizeMetroConfig(
    metroConfig,
    bundleConfig.detectCyclicDependencies,
    bundleConfig.detectDuplicateDependencies,
    tsprojectInfo,
    bundleConfig.experimental_treeShake
  );

  const metroBundleArgs = createMetroBundleArgs(bundleConfig);

  // ensure all output directories exist
  createDirectory(path.dirname(metroBundleArgs.bundleOutput));
  metroBundleArgs.sourcemapOutput &&
    createDirectory(path.dirname(metroBundleArgs.sourcemapOutput));
  metroBundleArgs.assetsDest && createDirectory(metroBundleArgs.assetsDest);

  // create the bundle
  await bundle(metroBundleArgs, metroConfig);
}
