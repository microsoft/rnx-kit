import type { BundleDefinitionWithRequiredParameters } from "@rnx-kit/config";
import {
  getBundleDefinition,
  getBundlePlatformDefinition,
  getKitConfig,
} from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import type { AllPlatforms } from "@rnx-kit/tools-react-native/platform";
import chalk from "chalk";
import type { KitBundleConfig } from "./types";

/**
 * Get a bundle definition from the kit configuration.
 *
 * @param id Optional bundle definition id. Only needed when the kit config has more than one definition.
 * @returns Bundle definition matching the id (if given), or the first bundle definition found. `undefined` if bundling is disabled or not supported for the kit.
 */
export function getKitBundleDefinition(
  id?: string
): BundleDefinitionWithRequiredParameters | undefined {
  const kitConfig = getKitConfig();
  if (!kitConfig) {
    throw new Error(
      "No kit configuration found for this react-native experience"
    );
  }

  if (kitConfig.bundle === null || kitConfig.bundle === undefined) {
    warn(
      chalk.yellow(
        "No bundle configuration found for this react-native experience -- skipping bundling"
      )
    );
    return undefined;
  } else if (!kitConfig.bundle) {
    warn(
      chalk.yellow(
        "Bundling is disabled for this react-native experience -- skipping"
      )
    );
    return undefined;
  }

  // get the bundle definition
  return getBundleDefinition(kitConfig.bundle, id);
}

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
    "No target platforms given. Update the kit configuration to include a target platform, or provide a target platform on the command-line."
  );
}

/**
 * Get bundle configuration and target platform(s) from kit config. Create
 * one config per platform, applying any platform-specific customizations in
 * the kit config.
 *
 * @param id Optional bundle definition id. Only needed when the kit config has more than one definition.
 * @param overridePlatform Override platform, typically from the command-line. When given, this overrides the list of target platforms.
 * @returns Arrary of kit bundle configurations, one per target platform, or `undefined` if bundling is disabled
 */
export function getKitBundleConfigs(
  id?: string,
  overridePlatform?: AllPlatforms
): KitBundleConfig[] | undefined {
  const bundleDefinition = getKitBundleDefinition(id);
  if (!bundleDefinition) {
    return undefined;
  }

  const platforms = getTargetPlatforms(
    overridePlatform,
    bundleDefinition.targets
  );

  return platforms.map<KitBundleConfig>((platform) => {
    return {
      ...getBundlePlatformDefinition(bundleDefinition, platform),
      platform,
    };
  });
}
