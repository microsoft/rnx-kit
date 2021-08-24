import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { info, warn } from "@rnx-kit/console";
import { bundle, BundleArgs, loadMetroConfig } from "@rnx-kit/metro-service";
import { extendObjectArray } from "@rnx-kit/tools-node/properties";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { Service } from "@rnx-kit/typescript-service";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import { getKitBundleConfigs } from "./bundle/kit-config";
import { applyKitBundleConfigOverrides } from "./bundle/overrides";
import type { BundleConfig, KitBundleConfig } from "./bundle/types";
import { customizeMetroConfig } from "./metro-config";
import type { TSProjectInfo } from "./types";

export type CLIBundleOptions = {
  id?: string;
  platform?: AllPlatforms;
  entryPath?: string;
  distPath?: string;
  assetsPath?: string;
  bundlePrefix?: string;
  bundleEncoding?: BundleArgs["bundleEncoding"];
  dev: boolean;
  minify?: boolean;
  experimentalTreeShake?: boolean;
  maxWorkers?: number;
  sourcemapOutput?: string;
  sourcemapSourcesRoot?: string;
  resetCache?: boolean;
  config?: string;
};

export async function rnxBundle(
  _argv: Array<string>,
  cliConfig: CLIConfig,
  cliOptions: CLIBundleOptions
): Promise<void> {
  const metroConfig = await loadMetroConfig(cliConfig, cliOptions);

  const kitBundleConfigs = getKitBundleConfigs(
    cliOptions.id,
    cliOptions.platform
  );
  if (!kitBundleConfigs) {
    return Promise.resolve();
  }

  applyKitBundleConfigOverrides(cliOptions, kitBundleConfigs);

  const bundleConfigs = extendObjectArray<KitBundleConfig, BundleConfig>(
    kitBundleConfigs,
    {
      dev: cliOptions.dev,
      minify: cliOptions.minify,
    }
  );

  const tsservice = new Service();

  for (const bundleConfig of bundleConfigs) {
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

  return Promise.resolve();
}
