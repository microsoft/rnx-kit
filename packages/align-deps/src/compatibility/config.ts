import type { KitConfig } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import { defaultConfig } from "../config";
import { dropPatchFromVersion, modifyManifest } from "../helpers";
import type { AlignDepsConfig, LegacyCheckConfig, Options } from "../types";

const legacyKeys = [
  "capabilities",
  "customProfiles",
  "reactNativeDevVersion",
  "reactNativeVersion",
] as const;

function findLegacyConfigKeys(config: KitConfig): (keyof KitConfig)[] {
  return legacyKeys.filter((key) => key in config);
}

/**
 * Transforms the old config schema into the new one.
 *
 * Note that this config is presented to the user and should therefore be
 * "pretty".
 *
 * @param oldConfig Config in old schema
 * @returns Config in new schema
 */
export function transformConfig({
  capabilities,
  customProfiles,
  kitType,
  manifest,
  reactNativeDevVersion,
  reactNativeVersion,
}: LegacyCheckConfig): AlignDepsConfig {
  const devVersion = dropPatchFromVersion(
    reactNativeDevVersion || reactNativeVersion
  );
  const prodVersion = dropPatchFromVersion(reactNativeVersion);
  return {
    kitType,
    alignDeps: {
      presets: customProfiles
        ? [...defaultConfig.presets, customProfiles]
        : defaultConfig.presets,
      requirements:
        kitType === "app"
          ? [`react-native@${prodVersion}`]
          : {
              development: [`react-native@${devVersion}`],
              production: [`react-native@${prodVersion}`],
            },
      capabilities,
    },
    manifest,
  };
}

/**
 * Migrates the old config schema into the new one, if necessary.
 *
 * This will function will allow users to let `align-deps` update their config.
 * Otherwise, it will tell them how to update their config manually. It will
 * also warn about old config keys that are no longer used.
 *
 * @param config Configuration in the package manifest
 * @param manifestPath Path to the package manifest to check
 * @param options Command line options
 * @returns The config in the new schema
 */
export function migrateConfig(
  config: AlignDepsConfig | LegacyCheckConfig,
  manifestPath: string,
  { migrateConfig }: Options
): AlignDepsConfig {
  if ("alignDeps" in config) {
    const oldKeys = findLegacyConfigKeys(config);
    if (oldKeys.length > 0) {
      const unsupportedKeys = oldKeys
        .map((key) => `'rnx-kit.${key}'`)
        .join(", ");
      warn(
        `${manifestPath}: The following keys are no longer supported: ${unsupportedKeys}`
      );
    }
    return config;
  }

  const newConfig = transformConfig(config);
  const { manifest, ...configOnly } = newConfig;

  if (migrateConfig) {
    const kitConfig = manifest["rnx-kit"];
    if (kitConfig) {
      for (const key of legacyKeys) {
        delete kitConfig[key];
      }
    }

    manifest["rnx-kit"] = {
      ...kitConfig,
      alignDeps: configOnly.alignDeps,
    };

    modifyManifest(manifestPath, manifest);
  } else {
    warn(`${manifestPath}: The config schema has changed. Please update your config to the following:

${JSON.stringify(configOnly, null, 2)}

Or run this command again with '--migrate-config' to update your config automatically.

Support for the old schema will be removed in a future release.`);
  }

  return newConfig;
}
