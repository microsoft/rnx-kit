import {
  MetroBundleOptions,
  MetroStartOptions,
  metroBundle,
  metroStart,
} from "./metro";
import { getKitConfig, AllPlatforms, BundleParameters } from "@rnx-kit/config";
import chalk from "chalk";

export function parseBoolean(val: string): boolean {
  if (val === "false") {
    return false;
  }
  if (val === "true") {
    return true;
  }
  throw new Error(
    "Invalid boolean value '" + val + "' -- must be true or false"
  );
}

export function parsePlatform(val: string): AllPlatforms {
  if (
    val === "ios" ||
    val === "android" ||
    val === "windows" ||
    val === "macos"
  ) {
    return val;
  }
  throw new Error("Invalid platform '" + val + "'");
}

export function rnxBundle(
  _argv: Array<string>,
  _config /*: ConfigT*/,
  options: Object
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

  //  construct override params from cmd-line options
  const {
    entryPath,
    distPath,
    assetsPath,
    bundlePrefix,
  } = options as BundleParameters;
  const bundleOverrides: BundleParameters = {
    ...(entryPath && { entryPath }),
    ...(distPath && { distPath }),
    ...(assetsPath && { assetsPath }),
    ...(bundlePrefix && { bundlePrefix }),
  };

  //  construct metro options from cmd-line options
  const { id, platform, dev } = options as MetroBundleOptions;
  const bundleOptions: MetroBundleOptions = {
    ...(id && { id }),
    ...(platform && { platform }),
    dev,
  };

  metroBundle(bundleConfig, bundleOptions, bundleOverrides);
}

export function rnxStart(
  _argv: Array<string>,
  _config /*: ConfigT*/,
  options: Object
): void {
  metroStart(options as MetroStartOptions);
}
