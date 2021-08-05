import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { info, warn } from "@rnx-kit/console";
import type { AllPlatforms } from "@rnx-kit/config";
import { BundleArgs, bundle, loadMetroConfig } from "@rnx-kit/metro-service";
import { Service } from "@rnx-kit/typescript-service";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import {
  getKitBundleDefinition,
  getKitBundlePlatformDefinition,
} from "./kit-config";
import { customizeMetroConfig } from "./metro-config";
import type { TSProjectInfo } from "./types";

function ensureDirectoryExists(directoryPath: string): void {
  fs.mkdirSync(directoryPath, { recursive: true, mode: 0o755 });
}

/**
 * Get the list of target platforms for bundling.
 *
 * @param overridePlatform Override platform, typically from the command-line. When given, this overrides the list of target platforms.
 * @param targetPlatforms Target platforms, typically from the kit configuration.
 * @returns Array of target platforms
 */
function getTargetPlatforms(
  overridePlatform?: AllPlatforms,
  targetPlatforms?: AllPlatforms[]
): AllPlatforms[] {
  if (overridePlatform) {
    return [overridePlatform];
  }
  if (targetPlatforms && targetPlatforms.length > 0) {
    return targetPlatforms;
  }
  throw new Error(
    "No target platforms given. Update the kit configuration to include a target platform, or provide a target platform on the command-line."
  );
}

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

  const bundleDefinition = getKitBundleDefinition(cliOptions.id);
  if (!bundleDefinition) {
    return Promise.resolve();
  }

  const targetPlatforms = getTargetPlatforms(
    cliOptions.platform,
    Object.keys(bundleDefinition.platforms ?? {}) as AllPlatforms[]
  );

  const tsservice = new Service();

  for (const targetPlatform of targetPlatforms) {
    info(`Bundling ${targetPlatform}...`);

    const platformDefinition = getKitBundlePlatformDefinition(
      bundleDefinition,
      targetPlatform,
      cliOptions
    );
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
    } = platformDefinition;

    //  assemble the full path to the bundle file
    const bundleExtension =
      targetPlatform === "ios" || targetPlatform === "macos"
        ? "jsbundle"
        : "bundle";
    const bundleFile = `${bundlePrefix}.${targetPlatform}.${bundleExtension}`;
    const bundlePath = path.join(distPath, bundleFile);

    let { sourceMapPath } = platformDefinition;

    //  always create a source-map in dev mode
    if (cliOptions.dev) {
      sourceMapPath = sourceMapPath ?? bundleFile + ".map";
    }

    //  use an absolute path for the source map file
    if (sourceMapPath) {
      sourceMapPath = path.join(distPath, sourceMapPath);
    }

    let tsprojectInfo: TSProjectInfo | undefined;
    if (typescriptValidation) {
      const configFileName = tsservice.findProject(entryPath, "tsconfig.json");
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
    ensureDirectoryExists(path.dirname(bundlePath));
    sourceMapPath && ensureDirectoryExists(path.dirname(sourceMapPath));
    assetsPath && ensureDirectoryExists(assetsPath);

    // create the bundle
    await bundle(
      {
        assetsDest: assetsPath,
        entryFile: entryPath,
        minify: cliOptions.minify,
        platform: targetPlatform,
        dev: cliOptions.dev,
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
