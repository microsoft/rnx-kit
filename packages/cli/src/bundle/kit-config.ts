import {
  getBundleConfig,
  getPlatformBundleConfig,
  getKitConfig,
} from "@rnx-kit/config";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import { getDefaultBundlerPlugins } from "./defaultPlugins";
import type { CliPlatformBundleConfig } from "./types";

/**
 * Get the list of target platforms for bundling.
 *
 * @param overridePlatform Override platform, typically from the command-line. When given, this overrides the list of target platforms.
 * @param targetPlatforms Target platforms, typically from the kit configuration.
 * @returns Array of target platforms
 */
export function getTargetPlatforms(
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
    "No target platforms given. Update the rnx-kit configuration to include a target platform, or provide a target platform on the command-line."
  );
}

function getDefaultBundleParameters(platform: string) {
  const extension =
    platform === "ios" || platform === "macos" ? "jsbundle" : "bundle";

  return {
    entryFile: "index.js",
    bundleOutput: `index.${platform}.${extension}`,
    sourcemapUseAbsolutePath: false,
  };
}

/**
 * Get the bundle configuration and target platform(s) from the rnx-kit
 * configuration. Use them to create an array of platform-specific
 * bundle configurations.
 *
 * If an id is given, search for the matching bundle definition. Otherwise, use the first bundle definition.
 *
 * @param id Optional identity of the target bundle definition to return
 * @param overridePlatform Override platform, typically from the command-line. When given, this overrides the list of target platforms.
 * @returns Array of platform-specific bundle configurations
 */
export function getCliPlatformBundleConfigs(
  id?: string,
  overridePlatform?: AllPlatforms
): CliPlatformBundleConfig[] {
  const kitConfig = getKitConfig();
  const maybeBundleConfig = kitConfig
    ? getBundleConfig(kitConfig, id)
    : undefined;
  const bundleConfig = maybeBundleConfig ?? {};

  const platforms = getTargetPlatforms(overridePlatform, bundleConfig.targets);

  return platforms.map<CliPlatformBundleConfig>((platform) => {
    const platformBundleConfig = getPlatformBundleConfig(
      bundleConfig,
      platform
    );

    // apply defaults to fill in any required props that are missing

    return {
      ...getDefaultBundlerPlugins(),
      ...getDefaultBundleParameters(platform),
      ...platformBundleConfig,
      platform,
    };
  });
}
