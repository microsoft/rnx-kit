import type { KitConfig } from "@rnx-kit/config";
import { getKitCapabilities, getKitConfig } from "@rnx-kit/config";
import { error, info, warn } from "@rnx-kit/console";
import { isPackageManifest, readPackage } from "@rnx-kit/tools-node/package";
import chalk from "chalk";
import { diffLinesUnified } from "jest-diff";
import path from "path";
import { migrateConfig } from "./compatibility/config";
import { gatherRequirements, getRequirements } from "./dependencies";
import { findBadPackages } from "./findBadPackages";
import { modifyManifest } from "./helpers";
import { updatePackageManifest } from "./manifest";
import {
  getProfilesFor,
  resolveCustomProfiles,
  v2_profilesSatisfying,
} from "./profiles";
import type {
  AlignDepsConfig,
  CheckConfig,
  CheckOptions,
  Command,
  Preset,
} from "./types";

export function getCheckConfig(
  manifestPath: string,
  {
    loose,
    uncheckedReturnCode = 0,
    supportedVersions,
    targetVersion,
  }: CheckOptions
): number | CheckConfig {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    error(
      `'${manifestPath}' does not contain a valid package manifest - please make sure it's not missing 'name' or 'version'`
    );
    return 1;
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      `Known bad packages are found in '${manifest.name}':\n` +
        badPackages
          .map((pkg) => `    ${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return uncheckedReturnCode;
  }

  const {
    reactNativeVersion: targetReactNativeVersion,
    reactNativeDevVersion,
    kitType,
    capabilities: targetCapabilities,
    customProfiles,
  } = getKitCapabilities({
    // React Native versions declared in the package's config should always
    // override the ones specified with the `--vigilant` flag.
    ...(supportedVersions
      ? { reactNativeVersion: supportedVersions }
      : undefined),
    // We should not set dev version if the package is configured. It may have
    // been intentionally left out to reuse `reactNativeVersion`.
    ...(!kitConfig.reactNativeVersion && targetVersion
      ? { reactNativeDevVersion: targetVersion }
      : undefined),
    ...kitConfig,
  });

  const customProfilesPath = resolveCustomProfiles(projectRoot, customProfiles);

  const { reactNativeVersion, capabilities: requiredCapabilities } =
    getRequirements(
      targetReactNativeVersion,
      kitType,
      manifest,
      projectRoot,
      customProfilesPath,
      { loose }
    );
  requiredCapabilities.push(...targetCapabilities);

  return {
    kitType,
    reactNativeVersion,
    reactNativeDevVersion,
    capabilities: requiredCapabilities,
    customProfilesPath,
    manifest,
  };
}

export function checkPackageManifest(
  manifestPath: string,
  options: CheckOptions
): number {
  const result = options.config || getCheckConfig(manifestPath, options);
  if (typeof result === "number") {
    return result;
  }

  const {
    kitType,
    reactNativeVersion,
    reactNativeDevVersion,
    capabilities,
    customProfilesPath,
    manifest,
  } = result;

  if (capabilities.length === 0) {
    return options.uncheckedReturnCode || 0;
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    capabilities,
    getProfilesFor(reactNativeVersion, customProfilesPath),
    getProfilesFor(reactNativeDevVersion, customProfilesPath),
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = JSON.stringify(updatedManifest, undefined, 2);
  const normalizedManifestJson = JSON.stringify(manifest, undefined, 2);

  if (updatedManifestJson !== normalizedManifestJson) {
    if (options.write) {
      modifyManifest(manifestPath, updatedManifest);
    } else {
      const diff = diffLinesUnified(
        normalizedManifestJson.split("\n"),
        updatedManifestJson.split("\n"),
        {
          aAnnotation: "Current",
          aColor: chalk.red,
          bAnnotation: "Expected",
          bColor: chalk.green,
        }
      );
      console.log(diff);

      error(
        "Changes are needed to satisfy all requirements. Re-run with `--write` to have dep-check apply them."
      );

      const url = chalk.bold("https://aka.ms/dep-check");
      info(`Visit ${url} for more information about dep-check.`);

      return 1;
    }
  }

  return 0;
}

function containsValidPresets(config: KitConfig["alignDeps"]): boolean {
  const presets = config?.presets;
  return !presets || (Array.isArray(presets) && presets.length > 0);
}

function containsValidRequirements(config: KitConfig["alignDeps"]): boolean {
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

function ensurePreset(preset: Preset, requirements: string[]): void {
  if (Object.keys(preset).length === 0) {
    throw new Error(
      `No profiles could satisfy requirements: ${requirements.join(", ")}`
    );
  }
}

export function v2_getConfig(
  manifestPath: string,
  { uncheckedReturnCode }: CheckOptions
): number | AlignDepsConfig | CheckConfig {
  const manifest = readPackage(manifestPath);
  if (!isPackageManifest(manifest)) {
    error(
      `'${manifestPath}' does not contain a valid package manifest — please make sure it's not missing 'name' or 'version'`
    );
    return 1;
  }

  const badPackages = findBadPackages(manifest);
  if (badPackages) {
    warn(
      `Known bad packages are found in '${manifest.name}':\n` +
        badPackages
          .map((pkg) => `    ${pkg.name}@${pkg.version}: ${pkg.reason}`)
          .join("\n")
    );
  }

  const projectRoot = path.dirname(manifestPath);
  const kitConfig = getKitConfig({ cwd: projectRoot });
  if (!kitConfig) {
    return uncheckedReturnCode || 0;
  }

  const { kitType = "library", alignDeps, ...config } = kitConfig;
  if (alignDeps) {
    const errors = [];
    if (!containsValidPresets(alignDeps)) {
      errors.push("'alignDeps.presets' cannot be empty");
    }
    if (!containsValidRequirements(alignDeps)) {
      errors.push("'alignDeps.requirements' cannot be empty");
    }
    if (errors.length > 0) {
      for (const e of errors) {
        error(e);
      }
      throw new Error("align-deps was not properly configured");
    }
    return {
      kitType,
      alignDeps: {
        presets: ["microsoft/react-native"],
        requirements: [],
        capabilities: [],
        ...alignDeps,
      },
      ...config,
      manifest,
    };
  }

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
  } as CheckConfig;
}

function resolve(
  { kitType, alignDeps, manifest }: AlignDepsConfig,
  projectRoot: string,
  options: CheckOptions
) {
  const { capabilities, presets, requirements } = alignDeps;

  const prodRequirements = Array.isArray(requirements)
    ? requirements
    : requirements.production;
  const initialProdPreset = v2_profilesSatisfying(
    prodRequirements,
    presets,
    projectRoot
  );
  ensurePreset(initialProdPreset, prodRequirements);

  const devPreset = (() => {
    if (kitType === "app") {
      // Preset for development is unused when the package is an app.
      return {};
    } else if (Array.isArray(requirements)) {
      return initialProdPreset;
    } else {
      const devRequirements = requirements.development;
      const devPreset = v2_profilesSatisfying(
        devRequirements,
        presets,
        projectRoot
      );
      ensurePreset(devPreset, devRequirements);
      return devPreset;
    }
  })();

  if (kitType === "app") {
    const { preset: prodMergedPreset, capabilities: mergedCapabilities } =
      gatherRequirements(
        projectRoot,
        manifest,
        initialProdPreset,
        capabilities,
        options
      );
    return {
      devPreset,
      prodPreset: prodMergedPreset,
      capabilities: mergedCapabilities,
    };
  }

  return { devPreset, prodPreset: initialProdPreset, capabilities };
}

export function v2_checkPackageManifest(
  manifestPath: string,
  options: CheckOptions
): number {
  const result = options.config || v2_getConfig(manifestPath, options);
  if (typeof result === "number") {
    return result;
  }

  const config = migrateConfig(result);
  if (config.alignDeps.capabilities.length === 0) {
    return options.uncheckedReturnCode || 0;
  }

  const { devPreset, prodPreset, capabilities } = resolve(
    config,
    path.dirname(manifestPath),
    options
  );
  const { kitType, manifest } = config;

  if (kitType === "app") {
    info(
      "Aligning dependencies according to the following profiles:",
      Object.keys(prodPreset).join(", ")
    );
  } else {
    info("Aligning dependencies according to the following profiles:");
    info("\t- Development:", Object.keys(devPreset).join(", "));
    info("\t- Production:", Object.keys(prodPreset).join(", "));
  }

  const updatedManifest = updatePackageManifest(
    manifest,
    capabilities,
    Object.values(prodPreset),
    Object.values(devPreset),
    kitType
  );

  // Don't fail when manifests only have whitespace differences.
  const updatedManifestJson = JSON.stringify(updatedManifest, undefined, 2);
  const normalizedManifestJson = JSON.stringify(manifest, undefined, 2);

  if (updatedManifestJson !== normalizedManifestJson) {
    if (options.write) {
      modifyManifest(manifestPath, updatedManifest);
    } else {
      const diff = diffLinesUnified(
        normalizedManifestJson.split("\n"),
        updatedManifestJson.split("\n"),
        {
          aAnnotation: "Current",
          aColor: chalk.red,
          bAnnotation: "Expected",
          bColor: chalk.green,
        }
      );
      console.log(diff);

      error(
        "Changes are needed to satisfy all requirements. Re-run with `--write` to apply them."
      );

      const url = chalk.bold("https://aka.ms/align-deps");
      info(`Visit ${url} for more information about align-deps.`);

      return 1;
    }
  }

  return 0;
}

export function makeCheckCommand(options: CheckOptions): Command {
  const check =
    process.env["DEP_CHECK_VERSION"] === "2"
      ? v2_checkPackageManifest
      : checkPackageManifest;
  return (manifest: string) => check(manifest, options);
}
