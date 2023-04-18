import type { KitConfig } from "@rnx-kit/config";
import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import type { PackageManifest } from "@rnx-kit/tools-node/package";
import { readPackage } from "@rnx-kit/tools-node/package";
import * as path from "path";
import { findBadPackages } from "./findBadPackages";
import type {
  AlignDepsConfig,
  ErrorCode,
  LegacyCheckConfig,
  Options,
} from "./types";

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

export function findEmptyRequirements(
  config: KitConfig["alignDeps"]
): string | undefined {
  const requirements = config?.requirements;
  if (requirements) {
    if (Array.isArray(requirements)) {
      if (requirements.length > 0) {
        return undefined;
      }
    } else if (typeof requirements === "object") {
      const environments = ["development", "production"] as const;
      const key = environments.find(
        (env) =>
          !Array.isArray(requirements[env]) || requirements[env].length === 0
      );
      return key && `requirements.${key}`;
    }
  }
  return "requirements";
}

/**
 * Determine if the given object is a `package.json` manifest.
 *
 * @param manifest Object to evaluate
 * @returns `true` if the object is a manifest
 */
export function isPackageManifest(
  manifest: unknown
): manifest is PackageManifest {
  return (
    typeof manifest === "object" &&
    manifest !== null &&
    "name" in manifest &&
    "version" in manifest
  );
}

/**
 * Loads configuration from the specified package manifest.
 * @param manifestPath The path to the package manifest to load configuration from
 * @param options Command line options
 * @returns The configuration; otherwise an error code
 */
export function loadConfig(
  manifestPath: string,
  { excludePackages }: Pick<Options, "excludePackages">
): ConfigResult {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    return "invalid-manifest";
  }

  if (excludePackages?.includes(manifest.name)) {
    return "excluded";
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

    const emptyReqs = findEmptyRequirements(alignDeps);
    if (emptyReqs) {
      errors.push(`${manifestPath}: 'alignDeps.${emptyReqs}' cannot be empty`);
    }

    if (errors.length > 0) {
      for (const e of errors) {
        error(e);
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
