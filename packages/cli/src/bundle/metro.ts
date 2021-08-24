import { info, warn } from "@rnx-kit/console";
import { bundle } from "@rnx-kit/metro-service";
import { Service } from "@rnx-kit/typescript-service";
import chalk from "chalk";
import fs from "fs";
import type { ConfigT } from "metro-config";
import path from "path";
import { customizeMetroConfig } from "../metro-config";
import type { TSProjectInfo } from "../types";
import type { BundleConfig } from "./types";

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
  const targetPlatform = bundleConfig.platform;

  info(`Bundling ${targetPlatform}...`);

  const {
    entryPath,
    distPath,
    assetsPath,
    bundlePrefix,
    bundleEncoding,
    sourceMapSourceRootPath,
    detectCyclicDependencies,
    detectDuplicateDependencies,
    typescriptValidation,
    experimental_treeShake,
  } = bundleConfig;

  //  assemble the full path to the bundle file
  const bundleExtension =
    targetPlatform === "ios" || targetPlatform === "macos"
      ? "jsbundle"
      : "bundle";
  const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
  const bundlePath = path.join(distPath, bundleFile);

  let { sourceMapPath } = bundleConfig;

  //  always create a source-map in dev mode
  if (bundleConfig.dev) {
    sourceMapPath = sourceMapPath ?? bundleFile + ".map";
  }

  //  use an absolute path for the source map file
  if (sourceMapPath) {
    sourceMapPath = path.join(distPath, sourceMapPath);
  }

  let tsprojectInfo: TSProjectInfo | undefined;
  if (typescriptValidation) {
    const configFileName = tsservice
      .getProjectConfigLoader()
      .find(entryPath, "tsconfig.json");
    if (!configFileName) {
      warn(
        chalk.yellow(
          "skipping TypeScript validation -- cannot find tsconfig.json for entry file %o"
        ),
        entryPath
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
    detectCyclicDependencies,
    detectDuplicateDependencies,
    tsprojectInfo,
    experimental_treeShake
  );

  // ensure all output directories exist
  fs.mkdirSync(path.dirname(bundlePath), { recursive: true, mode: 0o755 });
  sourceMapPath &&
    fs.mkdirSync(path.dirname(sourceMapPath), {
      recursive: true,
      mode: 0o755,
    });
  assetsPath && fs.mkdirSync(assetsPath, { recursive: true, mode: 0o755 });

  // create the bundle
  await bundle(
    {
      assetsDest: assetsPath,
      entryFile: entryPath,
      minify: bundleConfig.minify,
      platform: targetPlatform,
      dev: bundleConfig.dev,
      bundleOutput: bundlePath,
      bundleEncoding,
      sourcemapOutput: sourceMapPath,
      sourcemapSourcesRoot: sourceMapSourceRootPath,
    },
    metroConfig
  );
}
