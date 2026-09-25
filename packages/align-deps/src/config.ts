import { getKitConfigFromPackageManifest } from "@rnx-kit/config";
import { error, warn } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node/package";
import type { Capability, KitConfig } from "@rnx-kit/types-kit-config";
import type { PackageManifest } from "@rnx-kit/types-node";
import * as nodefs from "node:fs";
import * as path from "node:path";
import { findBadPackages } from "./bannedPackages.ts";
import { ILLEGAL_KEYS, isEmptyArray } from "./helpers.ts";
import type { AlignDepsOptions, ErrorCode, Options } from "./types.ts";

export type ConfigResult = AlignDepsOptions | ErrorCode;

/**
 * Keys from the old `dep-check` config schema. They are no longer supported,
 * but we still detect them so we can tell users how to migrate.
 */
const LEGACY_KEYS = [
  "capabilities",
  "customProfiles",
  "reactNativeDevVersion",
  "reactNativeVersion",
] as const;

export function findLegacyKeys(config: KitConfig): string[] {
  return LEGACY_KEYS.filter((key) => Object.hasOwn(config, key));
}

export const defaultConfig: AlignDepsOptions["alignDeps"] = {
  presets: ["microsoft/react-native"],
  requirements: [],
  capabilities: [],
};

export function containsValidPresets(config: KitConfig["alignDeps"]): boolean {
  const presets = config?.presets;
  return !presets || !isEmptyArray(presets);
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
      const key = environments.find((env) => isEmptyArray(requirements[env]));
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

export function sanitizeCapabilities(
  capabilities?: Capability[]
): Capability[] {
  return capabilities?.filter((c) => !ILLEGAL_KEYS.includes(c)) ?? [];
}

/**
 * Loads configuration from the specified package manifest.
 * @param manifestOrPath The path to the package manifest to load configuration
 *                       from or an already parsed manifest object
 * @param options Command line options
 * @returns The configuration; otherwise an error code
 */
export function loadConfig(
  manifestOrPath: string | { path: string; manifest: PackageManifest },
  { excludePackages }: Pick<Options, "excludePackages">,
  /** @internal */ fs = nodefs
): ConfigResult {
  const manifestPath =
    typeof manifestOrPath === "string" ? manifestOrPath : manifestOrPath.path;
  const manifest =
    typeof manifestOrPath === "string"
      ? readPackage(manifestPath, fs)
      : manifestOrPath.manifest;
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
  const kitConfig = getKitConfigFromPackageManifest(manifest, projectRoot);
  if (!kitConfig) {
    return "not-configured";
  }

  const { kitType = "library", alignDeps, ...config } = kitConfig;
  const legacyKeys = findLegacyKeys(kitConfig);
  if (!alignDeps) {
    return legacyKeys.length > 0 ? "legacy-configuration" : "not-configured";
  }

  if (legacyKeys.length > 0) {
    warn(
      `${manifestPath}: The following keys are no longer supported and can be removed: ${legacyKeys.join(", ")}`
    );
  }

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
      capabilities: sanitizeCapabilities(alignDeps.capabilities),
    },
    ...config,
    manifest,
  };
}
