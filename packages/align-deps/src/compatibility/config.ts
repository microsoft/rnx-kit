import type { KitConfig } from "@rnx-kit/config";
import { warn } from "@rnx-kit/console";
import { dropPatchFromVersion } from "../helpers";
import type { AlignDepsConfig, LegacyCheckConfig } from "../types";

function oldConfigKeys(config: KitConfig): (keyof KitConfig)[] {
  const oldKeys = [
    "capabilities",
    "customProfiles",
    "reactNativeDevVersion",
    "reactNativeVersion",
  ] as const;
  return oldKeys.filter((key) => key in config);
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
      presets: [
        "microsoft/react-native",
        ...(customProfiles ? [customProfiles] : []),
      ],
      requirements:
        kitType === "app"
          ? [`react-native@${reactNativeVersion}`]
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
  config: AlignDepsConfig | LegacyCheckConfig
): AlignDepsConfig {
  if ("alignDeps" in config) {
    const oldKeys = oldConfigKeys(config);
    if (oldKeys.length > 0) {
      const unsupportedKeys = oldKeys
        .map((key) => `'rnx-kit.${key}'`)
        .join(", ");
      warn(`The following keys are no longer supported: ${unsupportedKeys}`);
    }
    return config;
  }

  const newConfig = transformConfig(config);
  const { manifest, ...configOnly } = newConfig;

  warn(`The config schema has changed. Please update your config to the following:

${JSON.stringify(configOnly, null, 2)}

Support for the old schema will be removed in a future release.`);

  // TODO: Add a flag to automatically migrate users to the new config schema.

  return newConfig;
}
