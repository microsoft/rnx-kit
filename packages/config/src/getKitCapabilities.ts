import { warn } from "@rnx-kit/console";
import semver from "semver";
import type { KitConfig } from "./kitConfig";

type RequiredConfig = Required<
  Pick<
    KitConfig,
    "capabilities" | "kitType" | "reactNativeVersion" | "reactNativeDevVersion"
  >
>;

type OptionalConfig = Pick<KitConfig, "customProfiles">;

export type KitCapabilities = RequiredConfig & OptionalConfig;

export function getKitCapabilities({
  capabilities = [],
  kitType = "library",
  reactNativeVersion,
  reactNativeDevVersion: rawDevVersion,
  customProfiles,
}: KitConfig): KitCapabilities {
  if (
    !reactNativeVersion ||
    (!semver.valid(reactNativeVersion) &&
      !semver.validRange(reactNativeVersion))
  ) {
    throw new Error(`'${reactNativeVersion}' is not a valid version range`);
  }

  if (kitType === "app" && rawDevVersion) {
    warn("'reactNativeDevVersion' is not used when 'kitType' is 'app'");
  }

  const reactNativeDevVersion =
    rawDevVersion || semver.minVersion(reactNativeVersion)?.version;

  if (
    !reactNativeDevVersion ||
    !semver.subset(reactNativeDevVersion, reactNativeVersion)
  ) {
    throw new Error(
      `'${reactNativeDevVersion}' is not a valid dev version because it does not satisfy supported version range '${reactNativeVersion}'`
    );
  }

  return {
    capabilities,
    kitType,
    reactNativeVersion,
    reactNativeDevVersion,
    customProfiles,
  };
}
