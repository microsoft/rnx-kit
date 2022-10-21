import type { KitConfig } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import * as path from "path";
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

export function migrateConfig(
  config: AlignDepsConfig | LegacyCheckConfig,
  manifestPath: string,
  { migrateConfig }: Options
): AlignDepsConfig {
  const manifestRelPath = path.relative(process.cwd(), manifestPath);
  if ("alignDeps" in config) {
    const oldKeys = findLegacyConfigKeys(config);
    if (oldKeys.length > 0) {
      const unsupportedKeys = oldKeys
        .map((key) => `'rnx-kit.${key}'`)
        .join(", ");
      warn(
        `${manifestRelPath}: The following keys are no longer supported: ${unsupportedKeys}`
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
    warn(`${manifestRelPath}: The config schema has changed. Please update your config to the following:

${JSON.stringify(configOnly, null, 2)}

Or run this command again with '--migrate-config' to update your config automatically.

Support for the old schema will be removed in a future release.`);
  }

  return newConfig;
}
