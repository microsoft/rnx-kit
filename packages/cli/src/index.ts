import {
  MetroBundleOptions,
  MetroStartOptions,
  metroBundle,
  metroStart,
} from "./metro";
import { getKitConfig, AllPlatforms, BundleParameters } from "@rnx-kit/config";
import chalk from "chalk";

interface CliBundleOptions {
  id?: string;
  platform?: "ios" | "android" | "windows" | "win32" | "macos";
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
}

interface CliStartOptions {
  port?: number;
}

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
    val === "win32" ||
    val === "macos"
  ) {
    return val;
  }
  throw new Error("Invalid platform '" + val + "'");
}

export function rnxBundle(
  _argv: Array<string>,
  _config: Object /*: ConfigT*/,
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

  //  construct metro options from cmd-line options, eliminating unspecified values
  const bundleOptions: MetroBundleOptions = {
    ...(options.id && { id: options.id }),
    ...(options.platform && { platform: options.platform }),
    dev: options.dev,
    ...(typeof options.minify === "boolean" && { minify: options.minify }),
    ...(options.transformer && { transformer: options.transformer }),
    ...(typeof options.maxWorkers === "number" && {
      maxWorkers: options.maxWorkers,
    }),
    ...(typeof options.resetCache === "boolean" && {
      resetCache: options.resetCache,
    }),
    ...(typeof options.readGlobalCache === "boolean" && {
      readGlobalCache: options.readGlobalCache,
    }),
    ...(options.config && { configPath: options.config }),
  };

  metroBundle(bundleConfig, bundleOptions, bundleOverrides);
}

export function rnxStart(
  _argv: Array<string>,
  _config: Object /*: ConfigT*/,
  options: CliStartOptions
): void {
  //  construct metro options from cmd-line options, eliminating unspecified values
  const startOptions: MetroStartOptions = {
    ...(typeof options.port === "number" && { port: options.port }),
  };

  metroStart(startOptions);
}
