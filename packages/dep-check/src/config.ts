import type { KitConfig } from "@rnx-kit/config";
import semver from "semver";
import { getRequirements } from "./dependencies";
import type { PackageManifest } from "./types";

type KitManifest = Required<
  Pick<
    KitConfig,
    "capabilities" | "kitType" | "reactNativeVersion" | "reactNativeDevVersion"
  >
>;

function minVersion(version: string): string {
  const v = semver.minVersion(version)?.version;
  return v || "0.0.0";
}

export function parseConfig(
  {
    capabilities = [],
    kitType = "library",
    reactNativeVersion = "",
    reactNativeDevVersion,
  }: KitConfig,
  manifest: PackageManifest,
  projectRoot: string
): KitManifest {
  switch (kitType) {
    case "app": {
      const {
        reactNativeVersion,
        capabilities: requiredCapabilities,
      } = getRequirements(manifest, projectRoot);
      requiredCapabilities.push(...capabilities);
      return {
        capabilities: requiredCapabilities,
        kitType,
        reactNativeVersion,
        reactNativeDevVersion:
          reactNativeDevVersion || minVersion(reactNativeVersion),
      };
    }

    case "library": {
      return {
        capabilities,
        kitType,
        reactNativeVersion,
        reactNativeDevVersion:
          reactNativeDevVersion || minVersion(reactNativeVersion),
      };
    }
  }
}
