import type { KitConfig } from "@rnx-kit/config";
import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import { isPackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import * as path from "path";
import { findBadPackages } from "./findBadPackages";
import type { AlignDepsConfig, ErrorCode, LegacyCheckConfig } from "./types";

type ConfigResult = AlignDepsConfig | LegacyCheckConfig | ErrorCode;

export const defaultConfig: AlignDepsConfig["alignDeps"] = {
  presets: ["microsoft/react-native"],
  requirements: [],
  capabilities: [],
};

export function containsValidPresets(config: KitConfig["alignDeps"]): boolean {
  const presets = config?.presets;
  return !presets || (Array.isArray(presets) && presets.length > 0);
}

export function containsValidRequirements(
  config: KitConfig["alignDeps"]
): boolean {
  const requirements = config?.requirements;
  if (requirements) {
    if (Array.isArray(requirements)) {
      return requirements.length > 0;
    } else if (typeof requirements === "object") {
      return (
        Array.isArray(requirements.production) &&
        requirements.production.length > 0
      );
    }
  }
  return false;
}

/**
 * Loads configuration from the specified package manifest.
 * @param manifestPath The path to the package manifest to load configuration from
 * @param mode Determines whether partial configuration is allowed
 * @returns The configuration; otherwise an error code
 */
export function loadConfig(
  manifestPath: string,
  mode: "normal" | "vigilant" = "normal"
): ConfigResult {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    return "invalid-manifest";
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      `Known bad packages are found in '${manifestPath}':\n` +
        badPackages
          .map((pkg) => `\t${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return "not-configured";
  }

  const { kitType = "library", alignDeps, ...config } = kitConfig;
  if (alignDeps) {
    const errors = [];
    if (!containsValidPresets(alignDeps)) {
      errors.push(`${manifestPath}: 'alignDeps.presets' cannot be empty`);
    }
    if (!containsValidRequirements(alignDeps)) {
      errors.push(`${manifestPath}: 'alignDeps.requirements' cannot be empty`);
    }
    if (errors.length > 0) {
      // In "vigilant" mode, we allow partial configurations as they can be
      // provided by the user on the command line.
      if (mode === "normal") {
        for (const e of errors) {
          error(e);
        }
      }
      return "invalid-configuration";
    }
    return {
      kitType,
      alignDeps: {
        ...defaultConfig,
        ...alignDeps,
      },
      ...config,
      manifest,
    };
  }

  try {
    const {
      capabilities,
      customProfiles,
      reactNativeDevVersion,
      reactNativeVersion,
    } = getKitCapabilities(config);

    return {
      kitType,
      reactNativeVersion,
      ...(config.reactNativeDevVersion ? { reactNativeDevVersion } : undefined),
      capabilities,
      customProfiles,
      manifest,
    };
  } catch (e) {
    return "invalid-configuration";
  }
}
