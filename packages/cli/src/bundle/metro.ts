import { info } from "@rnx-kit/console";
import type { BundleArgs as MetroBundleArgs } from "@rnx-kit/metro-service";
import { bundle } from "@rnx-kit/metro-service";
import { ensureDir } from "@rnx-kit/tools-filesystem";
import type { ConfigT } from "metro-config";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { customizeMetroConfig } from "../helpers/metro-config";
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
 * @param output Output bundle format; defaults to plain JS
 */
export async function metroBundle(
  metroConfig: ConfigT,
  bundleConfig: CliPlatformBundleConfig,
  dev: boolean,
  minify?: boolean,
  output = bundle,
  fs = nodefs
): Promise<void> {
  info(`Bundling ${bundleConfig.platform}...`);

  if (!dev && bundleConfig.treeShake) {
    if (minify != null) {
      if (typeof bundleConfig.treeShake === "object") {
        bundleConfig.treeShake.minify = minify;
      } else {
        bundleConfig.treeShake = { minify };
      }
    }
  } else {
    bundleConfig.treeShake = false;
  }

  customizeMetroConfig(metroConfig, bundleConfig);

  const metroBundleArgs: MetroBundleArgs = {
    ...bundleConfig,
    dev,
    minify,
  };

  // ensure all output directories exist
  ensureDir(path.dirname(metroBundleArgs.bundleOutput), fs);
  if (metroBundleArgs.sourcemapOutput) {
    ensureDir(path.dirname(metroBundleArgs.sourcemapOutput), fs);
  }
  if (metroBundleArgs.assetsDest) {
    ensureDir(metroBundleArgs.assetsDest, fs);
  }

  // create the bundle
  await output(metroBundleArgs, metroConfig);
}
