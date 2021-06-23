import { AllPlatforms, BundleParameters, getKitConfig } from "@rnx-kit/config";
import chalk from "chalk";
import { metroBundle, MetroBundleOptions } from "./metro";

type CliBundleOptions = {
  id?: string;
  platform?: AllPlatforms;
  entryPath?: string;
  distPath?: string;
  assetsPath?: string;
  bundlePrefix?: string;
  bundleEncoding?: string;
  transformer?: string;
  dev: boolean;
  minify?: boolean;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  sourcemapUseAbsolutePath?: boolean;
  resetCache?: boolean;
  readGlobalCache?: boolean;
  config?: string;
};

type ConfigT = Record<string, unknown>;

export function rnxBundle(
  _argv: Array<string>,
  _config: ConfigT,
  options: CliBundleOptions
): void {
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
    return;
  } else if (!kitConfig.bundle) {
    console.warn(
      chalk.yellow(
        "Bundling is disabled for this react-native experience -- skipping"
      )
    );
    return;
  }
  const bundleConfig = kitConfig.bundle;

  //  construct override params from cmd-line options, eliminating unspecified values
  const bundleOverrides: BundleParameters = {
    ...(options.entryPath && { entryPath: options.entryPath }),
    ...(options.distPath && { distPath: options.distPath }),
    ...(options.assetsPath && { assetsPath: options.assetsPath }),
    ...(options.bundlePrefix && { bundlePrefix: options.bundlePrefix }),
    ...(options.bundleEncoding && { bundleEncoding: options.bundleEncoding }),
    ...(options.sourcemapOutput && { sourceMapPath: options.sourcemapOutput }),
    ...(options.sourcemapSourcesRoot && {
      sourceMapSourceRootPath: options.sourcemapSourcesRoot,
    }),
    ...(typeof options.sourcemapUseAbsolutePath === "boolean" && {
      sourceMapUseAbsolutePaths: options.sourcemapUseAbsolutePath,
    }),
  };

  //  construct metro options from cmd-line options
  const bundleOptions: MetroBundleOptions = options;
  //  handle renamed props
  bundleOptions.configPath = options.config;

  metroBundle(bundleConfig, bundleOptions, bundleOverrides);
}
