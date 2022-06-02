import { info } from "@rnx-kit/console";
import { bundle, BundleArgs as MetroBundleArgs } from "@rnx-kit/metro-service";
import { createDirectory } from "@rnx-kit/tools-node/fs";
import type { ConfigT } from "metro-config";
import path from "path";
import { customizeMetroConfig } from "../metro-config";
import type { CliPlatformBundleConfig } from "./types";

/**
 * Run the Metro bundler.
 *
 * @param metroConfig Metro configuration
 * @param bundleConfig Bundle configuration
 * @param dev Choose whether or not this will be a "developer" bundle. The alternative is a "production" bundle.
 *            When `true`, warnings are enabled, and the bundle is not minified by default.
 *            Further, optimizations like constant folding are disabled.
 *            When `false`, warnings are disabled and the bundle is minified by default.
 * @param minify Optionally choose whether or not the bundle is minified. When not set, minification is controlled by the `dev` property.
 */
export async function metroBundle(
  metroConfig: ConfigT,
  bundleConfig: CliPlatformBundleConfig,
  dev: boolean,
  minify?: boolean
): Promise<void> {
  info(`Bundling ${bundleConfig.platform}...`);

  customizeMetroConfig(
    metroConfig,
    bundleConfig.detectCyclicDependencies,
    bundleConfig.detectDuplicateDependencies,
    bundleConfig.typescriptValidation,
    bundleConfig.treeShake
  );

  const metroBundleArgs: MetroBundleArgs = {
    ...bundleConfig,
    dev,
    minify,
  };

  // ensure all output directories exist
  createDirectory(path.dirname(metroBundleArgs.bundleOutput));
  metroBundleArgs.sourcemapOutput &&
    createDirectory(path.dirname(metroBundleArgs.sourcemapOutput));
  metroBundleArgs.assetsDest && createDirectory(metroBundleArgs.assetsDest);

  // create the bundle
  await bundle(metroBundleArgs, metroConfig);
}
